"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function scanWineLabel(imageBase64: string) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Upload image to Supabase Storage in user's folder
  const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(imageData, "base64");
  const fileName = `${user.id}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("scans")
    .upload(fileName, buffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL for the image
  const {
    data: { publicUrl },
  } = supabase.storage.from("scans").getPublicUrl(fileName);

  // Create a scan record
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      user_id: user.id,
      image_path: fileName,
      scan_image_url: publicUrl,
      ocr_text: null, // Will be populated by the queue processor
      confidence: null,
    })
    .select()
    .single();

  if (scanError) throw scanError;

  // Add to processing queue
  const { data: queueItem, error: queueError } = await supabase
    .from("wines_added_queue")
    .insert({
      user_id: user.id,
      image_url: publicUrl,
      scan_id: scan.id,
      status: "pending",
    })
    .select()
    .single();

  if (queueError) throw queueError;

  // Invoke the edge function to process the queue immediately
  try {
    const { data, error: functionError } = await supabase.functions.invoke(
      "process-wine-queue",
      {
        body: {},
      },
    );

    if (functionError) {
      console.error("Failed to invoke edge function:", functionError);
    } else {
      console.log("Edge function invoked successfully:", data);
    }
  } catch (error) {
    console.error("Error invoking edge function:", error);
    // Don't throw - the item is already in the queue and can be processed later
  }

  return {
    scanId: scan.id,
    queueItemId: queueItem.id,
    message: "Wine label is being analyzed. Results will appear shortly.",
    wineData: null,
  };
}

export async function getUserScans() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("scans")
    .select(
      `
      *,
      matched_vintage:vintages(
        year,
        wine:wines(
          name,
          producer:producers(name)
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function improveOcrResult(scanId: string, correctedText: string) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("scans")
    .update({
      ocr_text: correctedText,
    })
    .eq("id", scanId)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/scan");
}

export async function confirmWineMatch(scanId: string, vintageId: string) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("scans")
    .update({
      matched_vintage_id: vintageId,
      confidence: 1.0,
    })
    .eq("id", scanId)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/scan");
}
