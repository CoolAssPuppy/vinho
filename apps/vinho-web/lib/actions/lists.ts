"use server"

import { createServerSupabase } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export async function parseWineListUrl(url: string) {
  const supabase = await createServerSupabase()

  // In production, this would call an Edge Function to crawl and parse the URL
  // For now, we'll create a placeholder wine list
  const { data: wineList, error: wineListError } = await supabase
    .from("wine_lists")
    .insert({
      source_url: url,
      source_type: "website",
      restaurant_name: extractRestaurantName(url),
      restaurant_url: url,
      parsed_at: new Date().toISOString()
    })
    .select()
    .single()

  if (wineListError) throw wineListError

  // In production, the Edge Function would extract and insert wine list items
  // For now, return the created list
  revalidatePath("/lists")
  return wineList
}

export async function getRestaurantWineLists() {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("wine_lists")
    .select(`
      *,
      wine_list_items(count)
    `)
    .order("parsed_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getWineListItems(wineListId: string) {
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from("wine_list_items")
    .select(`
      *,
      guessed_wine:wines(
        name,
        producer:producers(name)
      )
    `)
    .eq("wine_list_id", wineListId)
    .order("position")

  if (error) throw error
  return data
}

export async function addRestaurantFavorite(restaurantName: string, url?: string) {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("restaurant_favorites")
    .insert({
      user_id: user.id,
      restaurant_name: restaurantName,
      url
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath("/lists")
  return data
}

export async function removeRestaurantFavorite(favoriteId: string) {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("restaurant_favorites")
    .delete()
    .eq("id", favoriteId)
    .eq("user_id", user.id)

  if (error) throw error

  revalidatePath("/lists")
}

export async function getUserRestaurantFavorites() {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("restaurant_favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function analyzeWineList(wineListId: string) {
  const supabase = await createServerSupabase()

  // Get all items from the wine list
  const { data: items, error: itemsError } = await supabase
    .from("wine_list_items")
    .select("*")
    .eq("wine_list_id", wineListId)

  if (itemsError) throw itemsError

  // Analyze the wine list
  const analysis = {
    totalWines: items.length,
    averagePrice: items.reduce((sum, item) => sum + (item.price_cents || 0), 0) / items.length / 100,
    regionBreakdown: getRegionBreakdown(items),
    varietalBreakdown: getVarietalBreakdown(items),
    priceRange: {
      min: Math.min(...items.map(i => i.price_cents || 0)) / 100,
      max: Math.max(...items.map(i => i.price_cents || 0)) / 100
    },
    recommendations: generateListRecommendations(items)
  }

  return analysis
}

function extractRestaurantName(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, "").replace(/\.[^.]+$/, "").replace(/-/g, " ")
  } catch {
    return "Unknown Restaurant"
  }
}

function getRegionBreakdown(items: Array<{ region?: string | null }>) {
  const regions = items.reduce((acc, item) => {
    const region = item.region || "Unknown"
    acc[region] = (acc[region] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(regions)
    .sort(([, a], [, b]) => b - a)
    .map(([region, count]) => ({ region, count, percentage: (count / items.length * 100).toFixed(1) }))
}

function getVarietalBreakdown(items: Array<{ varietal?: string | null }>) {
  const varietals = items.reduce((acc, item) => {
    const varietal = item.varietal || "Unknown"
    acc[varietal] = (acc[varietal] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(varietals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([varietal, count]) => ({ varietal, count, percentage: (count / items.length * 100).toFixed(1) }))
}

function generateListRecommendations(items: Array<{ varietal?: string | null; price_cents?: number | null; region?: string | null }>) {
  const recommendations = []

  // Check for balance
  const redCount = items.filter(i => i.varietal?.toLowerCase().includes("cabernet") ||
                                     i.varietal?.toLowerCase().includes("merlot") ||
                                     i.varietal?.toLowerCase().includes("pinot noir")).length
  const whiteCount = items.filter(i => i.varietal?.toLowerCase().includes("chardonnay") ||
                                       i.varietal?.toLowerCase().includes("sauvignon blanc") ||
                                       i.varietal?.toLowerCase().includes("riesling")).length

  if (redCount > whiteCount * 2) {
    recommendations.push("Consider adding more white wine options for balance")
  }
  if (whiteCount > redCount * 2) {
    recommendations.push("Consider adding more red wine options for balance")
  }

  // Check price distribution
  const avgPrice = items.reduce((sum, i) => sum + (i.price_cents || 0), 0) / items.length / 100
  if (avgPrice > 150) {
    recommendations.push("Add some value-oriented selections under $50")
  }
  if (avgPrice < 60) {
    recommendations.push("Consider adding some premium selections for special occasions")
  }

  // Check for diversity
  const uniqueRegions = new Set(items.map(i => i.region)).size
  if (uniqueRegions < 5) {
    recommendations.push("Expand regional diversity to offer more exploration opportunities")
  }

  return recommendations
}