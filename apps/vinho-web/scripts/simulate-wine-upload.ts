/**
 * Wine upload simulation script.
 *
 * Authenticates as the test user, uploads 10 fixture wine label images to
 * local Supabase storage, creates scan records, queues them for processing,
 * and optionally invokes the process-wine-queue edge function.
 *
 * Usage:
 *   pnpm simulate               # Upload + queue only (no API keys needed)
 *   pnpm simulate --process     # Also invoke the edge function (needs OPENAI_API_KEY)
 *
 * Requires: local Supabase running (supabase start && supabase db reset)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const TEST_EMAIL = "test@vinho.app";
const TEST_PASSWORD = "testpassword123";
const FIXTURES_DIR = join(__dirname, "../../../supabase/fixtures/wine-labels");

const shouldProcess = process.argv.includes("--process");

type WineFixture = {
  filename: string;
  name: string;
};

const getFixtures = (): WineFixture[] => {
  const files = readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".jpg"))
    .sort();

  return files.map((filename) => ({
    filename,
    name: filename
      .replace(/^wine-\d+-/, "")
      .replace(".jpg", "")
      .replace(/-/g, " "),
  }));
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  console.log("Wine upload simulation");
  console.log("=".repeat(50));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Process queue: ${shouldProcess ? "yes" : "no (pass --process to enable)"}`);
  console.log();

  // 1. Authenticate
  console.log("[1/5] Authenticating as test user...");
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authError } =
    await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

  if (authError) {
    console.error("Auth failed:", authError.message);
    console.error("Make sure local Supabase is running: supabase start && supabase db reset");
    process.exit(1);
  }

  const userId = authData.user.id;
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`,
      },
    },
  });
  console.log(`  Authenticated as ${userId}`);

  // Service role client for queue operations
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 2. Load fixtures
  const fixtures = getFixtures();
  console.log(`\n[2/5] Found ${fixtures.length} fixture images`);

  if (fixtures.length === 0) {
    console.error("No fixtures found in", FIXTURES_DIR);
    process.exit(1);
  }

  // 3. Upload images and create scan records
  console.log("\n[3/5] Uploading images and creating scan records...");
  const scanIds: string[] = [];
  const queueIds: string[] = [];

  for (const fixture of fixtures) {
    const filePath = join(FIXTURES_DIR, fixture.filename);
    const fileBuffer = readFileSync(filePath);
    const storagePath = `${userId}/${Date.now()}-${fixture.filename}`;

    // Upload to storage
    const { error: uploadError } = await userClient.storage
      .from("scans")
      .upload(storagePath, fileBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error(`  FAIL ${fixture.name}: upload error - ${uploadError.message}`);
      continue;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/scans/${storagePath}`;

    // Create scan record
    const { data: scan, error: scanError } = await userClient
      .from("scans")
      .insert({
        user_id: userId,
        image_path: storagePath,
        scan_image_url: publicUrl,
      })
      .select("id")
      .single();

    if (scanError) {
      console.error(`  FAIL ${fixture.name}: scan error - ${scanError.message}`);
      continue;
    }

    scanIds.push(scan.id);
    console.log(`  OK   ${fixture.name} -> scan ${scan.id.slice(0, 8)}...`);

    // Small delay to avoid idempotency collisions
    await sleep(50);
  }

  // 4. Queue all scans for processing
  console.log(`\n[4/5] Creating ${scanIds.length} queue items...`);

  for (let i = 0; i < scanIds.length; i++) {
    const scanId = scanIds[i];
    const fixture = fixtures[i];

    // Get the scan's image URL
    const { data: scanData } = await serviceClient
      .from("scans")
      .select("scan_image_url")
      .eq("id", scanId)
      .single();

    const { data: queueItem, error: queueError } = await userClient
      .from("wines_added_queue")
      .insert({
        user_id: userId,
        image_url: scanData?.scan_image_url || "",
        scan_id: scanId,
        status: "pending",
        idempotency_key: `sim-${Date.now()}-${i}`,
      })
      .select("id, status")
      .single();

    if (queueError) {
      console.error(`  FAIL ${fixture.name}: queue error - ${queueError.message}`);
      continue;
    }

    queueIds.push(queueItem.id);
    console.log(`  OK   ${fixture.name} -> queue ${queueItem.id.slice(0, 8)}... [${queueItem.status}]`);
  }

  // 5. Optionally invoke the edge function
  if (shouldProcess) {
    console.log("\n[5/5] Invoking process-wine-queue edge function...");

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/process-wine-queue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(`  Edge function returned ${response.status}: ${body}`);
    } else {
      const result = await response.json();
      console.log("  Edge function response:", JSON.stringify(result, null, 2));
    }

    // Poll queue status
    console.log("\n  Polling queue status...");
    const maxWaitMs = 120_000;
    const startTime = Date.now();
    let allDone = false;

    while (!allDone && Date.now() - startTime < maxWaitMs) {
      await sleep(3000);

      const { data: items } = await serviceClient
        .from("wines_added_queue")
        .select("id, status, error_message")
        .in("id", queueIds);

      if (!items) continue;

      const pending = items.filter(
        (i) => i.status === "pending" || i.status === "working" || i.status === "processing"
      );
      const completed = items.filter((i) => i.status === "completed");
      const failed = items.filter((i) => i.status === "failed");

      console.log(
        `  [${Math.round((Date.now() - startTime) / 1000)}s] ` +
          `pending: ${pending.length}, completed: ${completed.length}, failed: ${failed.length}`
      );

      if (pending.length === 0) {
        allDone = true;
      }
    }

    if (!allDone) {
      console.log("  Timed out waiting for queue completion.");
    }
  } else {
    console.log("\n[5/5] Skipping edge function (pass --process to enable)");
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("Summary");
  console.log("=".repeat(50));

  const { data: finalQueue } = await serviceClient
    .from("wines_added_queue")
    .select("id, status, error_message, processed_data")
    .in("id", queueIds);

  if (finalQueue) {
    const byStatus: Record<string, number> = {};
    for (const item of finalQueue) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }

    console.log(`Images uploaded:  ${scanIds.length}`);
    console.log(`Queue items:      ${queueIds.length}`);
    for (const [status, count] of Object.entries(byStatus)) {
      console.log(`  ${status}: ${count}`);
    }

    const failures = finalQueue.filter((i) => i.status === "failed");
    if (failures.length > 0) {
      console.log("\nFailures:");
      for (const f of failures) {
        console.log(`  ${f.id.slice(0, 8)}... - ${f.error_message || "unknown"}`);
      }
    }

    const completed = finalQueue.filter((i) => i.status === "completed");
    if (completed.length > 0) {
      console.log("\nCompleted wines:");
      for (const c of completed) {
        const pd = c.processed_data as Record<string, unknown> | null;
        const wineName = pd?.wine_name || pd?.name || "unknown";
        const producer = pd?.producer_name || pd?.producer || "unknown";
        console.log(`  ${c.id.slice(0, 8)}... - ${producer} / ${wineName}`);
      }
    }
  }

  console.log("\nDone.");
};

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
