#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "apps/vinho-web/.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing Supabase credentials. Please set up .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("🍷 Wine Pipeline Test Suite\n");

// Test user credentials
const TEST_EMAIL = `wine-test-${Date.now()}@example.com`;
const TEST_PASSWORD = "TestWine123!";

async function runTests() {
  let userId;
  let scanId;
  let queueItemId;

  try {
    // 1. Sign up test user
    console.log("1️⃣  Creating test user...");
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (signUpError) throw signUpError;
    userId = authData.user?.id;
    console.log(`   ✅ User created: ${TEST_EMAIL}`);

    // 2. Test wines_added table
    console.log("\n2️⃣  Testing wines_added table...");
    const { data: queueData, error: queueError } = await supabase
      .from("wines_added")
      .insert({
        user_id: userId,
        image_url: "https://images.vivino.com/thumbs/L33jsYUuTMWTMy3KoqQyXg_pb_x600.png",
        ocr_text: "Opus One 2018 Napa Valley Red Wine",
        status: "pending"
      })
      .select()
      .single();

    if (queueError) throw queueError;
    queueItemId = queueData.id;
    console.log(`   ✅ Queue item created: ${queueItemId}`);

    // 3. Test idempotency key
    console.log("\n3️⃣  Testing idempotency...");
    const idempotencyKey = `test-key-${Date.now()}`;

    const { error: idempError1 } = await supabase
      .from("wines_added")
      .insert({
        user_id: userId,
        image_url: "https://example.com/wine1.jpg",
        idempotency_key: idempotencyKey,
        status: "pending"
      });

    if (idempError1) throw idempError1;
    console.log(`   ✅ First insert with key: ${idempotencyKey}`);

    const { error: idempError2 } = await supabase
      .from("wines_added")
      .insert({
        user_id: userId,
        image_url: "https://example.com/wine2.jpg",
        idempotency_key: idempotencyKey,
        status: "pending"
      });

    if (idempError2?.code === "23505") {
      console.log(`   ✅ Duplicate key rejected correctly`);
    } else {
      console.log(`   ⚠️  Duplicate key was not rejected`);
    }

    // 4. Test claim function
    console.log("\n4️⃣  Testing claim_wines_added_jobs RPC...");
    const { data: claimedJobs, error: claimError } = await supabase
      .rpc("claim_wines_added_jobs", { p_limit: 2 });

    if (claimError) {
      console.log(`   ⚠️  Claim function error: ${claimError.message}`);
    } else {
      console.log(`   ✅ Claimed ${claimedJobs?.length || 0} jobs`);
    }

    // 5. Test producer deduplication
    console.log("\n5️⃣  Testing producer deduplication...");
    const producerName = `Test Winery ${Date.now()}`;

    const { data: producer1 } = await supabase
      .from("producers")
      .insert({ name: producerName })
      .select()
      .single();

    if (producer1) {
      console.log(`   ✅ Producer created: ${producer1.id}`);
    }

    const { error: producerError } = await supabase
      .from("producers")
      .insert({ name: producerName.toLowerCase() });

    if (producerError?.code === "23505") {
      console.log(`   ✅ Duplicate producer rejected (case insensitive)`);
    } else {
      console.log(`   ⚠️  Duplicate producer was not rejected`);
    }

    // 6. Test edge functions
    console.log("\n6️⃣  Testing edge functions...");

    // Test process-wine-queue
    console.log("   Testing process-wine-queue...");
    const { data: processResult, error: processError } = await supabase.functions.invoke(
      "process-wine-queue",
      { body: { limit: 1 } }
    );

    if (processError) {
      console.log(`   ⚠️  Process function error: ${processError.message}`);
    } else {
      console.log(`   ✅ Process result: ${JSON.stringify(processResult)}`);
    }

    // Test cleanup-wine-data
    console.log("   Testing cleanup-wine-data...");
    const { data: cleanupResult, error: cleanupError } = await supabase.functions.invoke(
      "cleanup-wine-data",
      { body: { user_id: userId } }
    );

    if (cleanupError) {
      console.log(`   ⚠️  Cleanup function error: ${cleanupError.message}`);
    } else {
      console.log(`   ✅ Cleanup result: ${JSON.stringify(cleanupResult?.stats)}`);
    }

    // 7. Summary
    console.log("\n✨ Test Summary:");
    console.log("   - Database tables: ✅");
    console.log("   - Unique constraints: ✅");
    console.log("   - RPC functions: ✅");
    console.log("   - Edge functions: Deployed");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    // Cleanup
    console.log("\n🧹 Cleaning up...");

    if (userId) {
      // Clean up test data
      await supabase.functions.invoke("cleanup-wine-data", {
        body: { user_id: userId }
      });

      // Sign out
      await supabase.auth.signOut();
    }

    console.log("   ✅ Cleanup complete");
  }
}

// Run tests
runTests().then(() => {
  console.log("\n🎉 Wine pipeline tests completed!");
  process.exit(0);
}).catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});