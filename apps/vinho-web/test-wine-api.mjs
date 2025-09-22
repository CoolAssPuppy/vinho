#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("🍷 Wine Pipeline API Test\n");

async function testAPI() {
  try {
    // Test cleanup function
    console.log("Testing cleanup-wine-data function...");
    const { data: cleanupData, error: cleanupError } = await supabase.functions.invoke(
      "cleanup-wine-data",
      { body: { delete_all: true } }
    );

    if (cleanupError) {
      console.error("❌ Cleanup error:", cleanupError.message);
    } else {
      console.log("✅ Cleanup successful:", cleanupData);
    }

    // Test process-wine-queue function
    console.log("\nTesting process-wine-queue function...");
    const { data: processData, error: processError } = await supabase.functions.invoke(
      "process-wine-queue",
      { body: { limit: 1 } }
    );

    if (processError) {
      console.error("❌ Process error:", processError.message);
    } else {
      console.log("✅ Process successful:", processData);
    }

    console.log("\n✨ API test complete!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testAPI();