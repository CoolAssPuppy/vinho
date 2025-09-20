"use server"

import { createServerSupabase } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export async function scanWineLabel(_imageBase64: string) {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // In production, this would:
  // 1. Upload image to Supabase Storage
  // 2. Call Edge Function with OCR capabilities
  // 3. Parse extracted text
  // 4. Match against wine database

  // For now, create a scan record
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      user_id: user.id,
      image_path: "placeholder.jpg", // In production, actual storage path
      ocr_text: "Sample OCR text from wine label",
      confidence: 0.85
    })
    .select()
    .single()

  if (scanError) throw scanError

  // Try to match wine (in production, use OCR text)
  const { data: wines } = await supabase
    .from("wines")
    .select(`
      *,
      producer:producers(name, region:regions(name, country)),
      vintages(
        id,
        year,
        abv,
        wine_varietals(
          percent,
          varietal:grape_varietals(name)
        )
      )
    `)
    .limit(1)
    .single()

  if (wines && wines.vintages?.length > 0) {
    // Update scan with matched wine
    await supabase
      .from("scans")
      .update({
        matched_vintage_id: wines.vintages[0].id,
        confidence: 0.92
      })
      .eq("id", scan.id)

    return {
      scan,
      wine: wines,
      vintage: wines.vintages[0],
      confidence: 0.92
    }
  }

  return {
    scan,
    wine: null,
    vintage: null,
    confidence: 0
  }
}

export async function getUserScans() {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("scans")
    .select(`
      *,
      matched_vintage:vintages(
        year,
        wine:wines(
          name,
          producer:producers(name)
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function improveOcrResult(scanId: string, correctedText: string) {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("scans")
    .update({
      ocr_text: correctedText
    })
    .eq("id", scanId)
    .eq("user_id", user.id)

  if (error) throw error

  revalidatePath("/scan")
}

export async function confirmWineMatch(scanId: string, vintageId: string) {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("scans")
    .update({
      matched_vintage_id: vintageId,
      confidence: 1.0
    })
    .eq("id", scanId)
    .eq("user_id", user.id)

  if (error) throw error

  revalidatePath("/scan")
}