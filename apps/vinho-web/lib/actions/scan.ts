"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function scanWineLabel(imageBase64: string) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  try {
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

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

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

    if (scanError) {
      console.error("Scan insert error:", scanError);
      throw new Error(`Failed to create scan record: ${scanError.message}`);
    }

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

    if (queueError) {
      console.error("Queue insert error:", queueError);
      throw new Error(`Failed to add to processing queue: ${queueError.message}`);
    }

    // Invoke the edge function to process the queue immediately. A failure
    // here is non-fatal: the item is queued and the cron sweep will pick it up.
    try {
      const { error: functionError } = await supabase.functions.invoke(
        "process-wine-queue",
        {
          body: {},
        },
      );

      if (functionError) {
        console.error("Failed to invoke process-wine-queue:", functionError);
      }
    } catch (error) {
      console.error("Error invoking process-wine-queue:", error);
    }

    return {
      scanId: scan.id,
      queueItemId: queueItem.id,
      message: "Wine label is being analyzed. Results will appear shortly.",
      wineData: null,
    };
  } catch (error) {
    console.error("scanWineLabel error:", error);
    throw error;
  }
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
