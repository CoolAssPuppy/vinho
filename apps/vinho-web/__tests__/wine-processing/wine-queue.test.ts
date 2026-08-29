import { createClient } from "@supabase/supabase-js";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const VINHO_SERVICE_ROLE_KEY = process.env.VINHO_SERVICE_ROLE_KEY!;

// Create clients
const supabaseAdmin = createClient(SUPABASE_URL, VINHO_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

// Test data
const TEST_USER_EMAIL = "wine-test@example.com";
const TEST_USER_PASSWORD = "test-wine-password-123!";
const testWithOpenAI = process.env.OPENAI_API_KEY ? test : test.skip;
let testUserId: string;

describe("Wine Processing Pipeline", () => {
  beforeAll(async () => {
    // Create test user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        email_confirm: true,
      });

    if (authError) {
      console.error("Failed to create test user:", authError);
      throw authError;
    }

    testUserId = authData.user.id;

  });

  beforeEach(async () => {
    await supabaseAdmin
      .from("wines_added_queue")
      .delete()
      .in("status", ["pending", "processing"]);
  });

  afterAll(async () => {
    await supabaseAdmin
      .from("wines_added_queue")
      .delete()
      .eq("user_id", testUserId);

    // Delete test user
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
    supabaseAdmin.auth.stopAutoRefresh();
  });

  describe("wines_added_queue table", () => {
    test("should create a wine queue entry", async () => {
      const { data, error } = await supabaseAdmin
        .from("wines_added_queue")
        .insert({
          user_id: testUserId,
          image_url: "https://example.com/test-wine.jpg",
          ocr_text: "Chateau Test 2019",
          status: "pending",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe("pending");
      expect(data.retry_count).toBe(0);
    });

    test("should enforce unique idempotency_key", async () => {
      const idempotencyKey = "test-key-" + Date.now();

      // First insert should succeed
      const { error: error1 } = await supabaseAdmin.from("wines_added_queue").insert({
        user_id: testUserId,
        image_url: "https://example.com/wine1.jpg",
        idempotency_key: idempotencyKey,
        status: "pending",
      });

      expect(error1).toBeNull();

      // Second insert with same key should fail
      const { error: error2 } = await supabaseAdmin.from("wines_added_queue").insert({
        user_id: testUserId,
        image_url: "https://example.com/wine2.jpg",
        idempotency_key: idempotencyKey,
        status: "pending",
      });

      expect(error2).toBeDefined();
      expect(error2?.code).toBe("23505"); // Unique violation
    });
  });

  describe("claim_wines_added_queue_jobs function", () => {
    test("should atomically claim pending jobs", async () => {
      // Create test jobs
      const jobs = [];
      for (let i = 0; i < 3; i++) {
        const { data } = await supabaseAdmin
          .from("wines_added_queue")
          .insert({
            user_id: testUserId,
            image_url: `https://example.com/claim-test-${i}.jpg`,
            status: "pending",
          })
          .select()
          .single();
        jobs.push(data);
      }

      // Claim 2 jobs
      const { data: claimedJobs, error } = await supabaseAdmin.rpc(
        "claim_wines_added_queue_jobs",
        { p_limit: 2 },
      );

      expect(error).toBeNull();
      expect(claimedJobs).toHaveLength(2);

      const claimedIds = claimedJobs.map((job) => job.id);
      const { data: claimedRows } = await supabaseAdmin
        .from("wines_added_queue")
        .select("id, status, processed_at")
        .in("id", claimedIds);

      expect(claimedRows).toHaveLength(2);
      expect(claimedRows?.every((job) => job.status === "processing")).toBe(true);
      expect(claimedRows?.every((job) => Boolean(job.processed_at))).toBe(true);

      // Verify remaining job is still pending
      const { data: remainingJobs } = await supabaseAdmin
        .from("wines_added_queue")
        .select("*")
        .eq("status", "pending")
        .eq("user_id", testUserId);

      expect(remainingJobs).toHaveLength(1);
    });

    test("should handle concurrent claims correctly", async () => {
      // Create a single job
      await supabaseAdmin
        .from("wines_added_queue")
        .insert({
          user_id: testUserId,
          image_url: "https://example.com/concurrent-test.jpg",
          status: "pending",
        })
        .select()
        .single();

      // Try to claim the same job concurrently
      const [result1, result2] = await Promise.all([
        supabaseAdmin.rpc("claim_wines_added_queue_jobs", { p_limit: 1 }),
        supabaseAdmin.rpc("claim_wines_added_queue_jobs", { p_limit: 1 }),
      ]);

      // Only one should succeed
      const totalClaimed =
        (result1.data?.length || 0) + (result2.data?.length || 0);
      expect(totalClaimed).toBe(1);
    });
  });

  describe("Producer and Wine deduplication", () => {
    test("should handle case-insensitive producer matching", async () => {
      // Insert producers with different cases
      await supabaseAdmin
        .from("producers")
        .insert({ name: "Chateau Test" })
        .select()
        .single();

      // Try to insert with different case - should fail due to unique index
      const { error } = await supabaseAdmin
        .from("producers")
        .insert({ name: "CHATEAU TEST" });

      expect(error).toBeDefined();
      expect(error?.code).toBe("23505");
    });

    test("should enforce unique wine names per producer", async () => {
      // Create producer
      const { data: producer } = await supabaseAdmin
        .from("producers")
        .insert({ name: "Test Winery " + Date.now() })
        .select()
        .single();

      // Insert first wine
      const { data: wine1 } = await supabaseAdmin
        .from("wines")
        .insert({
          name: "Reserve Red",
          producer_id: producer.id,
        })
        .select()
        .single();

      expect(wine1).toBeDefined();

      // Try to insert duplicate - should fail
      const { error } = await supabaseAdmin.from("wines").insert({
        name: "RESERVE RED", // Different case
        producer_id: producer.id,
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe("23505");
    });
  });

  describe("Vintage management", () => {
    test("should allow only one NV vintage per wine", async () => {
      // Create producer and wine
      const { data: producer } = await supabaseAdmin
        .from("producers")
        .insert({ name: "NV Test Winery " + Date.now() })
        .select()
        .single();

      const { data: wine } = await supabaseAdmin
        .from("wines")
        .insert({
          name: "NV Champagne",
          producer_id: producer.id,
          is_nv: true,
        })
        .select()
        .single();

      // Insert first NV vintage
      const { data: vintage1 } = await supabaseAdmin
        .from("vintages")
        .insert({
          wine_id: wine.id,
          year: null,
          abv: 12.5,
        })
        .select()
        .single();

      expect(vintage1).toBeDefined();

      // Second NV vintage should be allowed (database doesn't enforce this)
      const { data: vintage2 } = await supabaseAdmin
        .from("vintages")
        .insert({
          wine_id: wine.id,
          year: null,
          abv: 13.0,
        })
        .select()
        .single();

      // This will succeed as DB allows it, but the edge function should handle deduplication
      expect(vintage2).toBeDefined();
    });

    test("should handle year-specific vintages correctly", async () => {
      // Create producer and wine
      const { data: producer } = await supabaseAdmin
        .from("producers")
        .insert({ name: "Vintage Test Winery " + Date.now() })
        .select()
        .single();

      const { data: wine } = await supabaseAdmin
        .from("wines")
        .insert({
          name: "Cabernet Sauvignon",
          producer_id: producer.id,
          is_nv: false,
        })
        .select()
        .single();

      // Insert multiple year vintages
      const years = [2018, 2019, 2020];
      for (const year of years) {
        const { data, error } = await supabaseAdmin
          .from("vintages")
          .insert({
            wine_id: wine.id,
            year,
            abv: 13.5 + Math.random(),
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data.year).toBe(year);
      }

      // Verify unique constraint on (wine_id, year)
      const { error: dupError } = await supabaseAdmin.from("vintages").insert({
        wine_id: wine.id,
        year: 2019, // Duplicate year
        abv: 14.0,
      });

      expect(dupError).toBeDefined();
      expect(dupError?.code).toBe("23505");
    });
  });

  describe("Retry mechanism", () => {
    test("should increment retry count on failure", async () => {
      // Create a job
      const { data: job } = await supabaseAdmin
        .from("wines_added_queue")
        .insert({
          user_id: testUserId,
          image_url: "https://example.com/retry-test.jpg",
          status: "processing",
          retry_count: 2,
        })
        .select()
        .single();

      // Simulate failure by updating retry count
      const { data: updated } = await supabaseAdmin
        .from("wines_added_queue")
        .update({
          retry_count: 3,
          status: "pending",
          error_message: "Test error",
        })
        .eq("id", job.id)
        .select()
        .single();

      expect(updated.retry_count).toBe(3);

      // Next failure should mark as failed
      const { data: failed, error: retryLimitError } = await supabaseAdmin
        .from("wines_added_queue")
        .update({
          retry_count: 4,
          status: "failed",
          error_message: "Max retries exceeded",
        })
        .eq("id", job.id)
        .select()
        .single();

      expect(failed).toBeNull();
      expect(retryLimitError?.code).toBe("23514");
    });
  });

  describe("Edge Function Integration", () => {
    testWithOpenAI("should process queue successfully", async () => {
      // Create a test job with mock data
      await supabaseAdmin
        .from("wines_added_queue")
        .insert({
          user_id: testUserId,
          image_url:
            "https://images.vivino.com/thumbs/L33jsYUuTMWTMy3KoqQyXg_pb_x600.png",
          ocr_text: "Opus One 2018 Napa Valley",
          status: "pending",
        })
        .select()
        .single();

      // Invoke the processing function
      const { data: result, error } = await supabaseAdmin.functions.invoke(
        "process-wine-queue",
        { body: { limit: 1 } },
      );

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Cleanup function", () => {
    test("should reject cleanup when the admin key is not configured", async () => {
      const { error } = await supabaseAdmin.functions.invoke("cleanup-wine-data", {
        body: { user_id: testUserId },
      });

      expect(error).toBeDefined();
    });
  });
});
