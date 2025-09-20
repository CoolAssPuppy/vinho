"use server"

import { createServerSupabase } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export async function searchWines(query: string) {
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from("wines")
    .select(`
      *,
      producer:producers(name, region:regions(name, country)),
      vintages(year, abv, climate_zone:climate_zones(name, koppen))
    `)
    .ilike("name", `%${query}%`)
    .limit(10)

  if (error) throw error
  return data
}

export async function getWineDetails(wineId: string) {
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from("wines")
    .select(`
      *,
      producer:producers(
        name,
        website,
        location,
        region:regions(
          name,
          country,
          climate_zone:climate_zones(name, koppen, notes)
        )
      ),
      vintages(
        id,
        year,
        abv,
        soil_type:soil_types(name, description),
        climate_zone:climate_zones(name, koppen),
        wine_varietals(
          percent,
          varietal:grape_varietals(name, parent_a, parent_b)
        )
      )
    `)
    .eq("id", wineId)
    .single()

  if (error) throw error
  return data
}

export async function getSimilarWines(vintageId: string) {
  const supabase = await createServerSupabase()

  // For now, return similar wines based on the same region
  const { data: vintage } = await supabase
    .from("vintages")
    .select("wine:wines(producer:producers(region_id))")
    .eq("id", vintageId)
    .single()

  if (!vintage?.wine?.producer?.region_id) return []

  const { data, error } = await supabase
    .from("vintages")
    .select(`
      *,
      wine:wines(
        name,
        producer:producers(name, region:regions(name, country))
      )
    `)
    .neq("id", vintageId)
    .limit(10)

  if (error) throw error
  return data || []
}

export async function addTasting(vintageId: string, notes: string, verdict: number) {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("tastings")
    .insert({
      vintage_id: vintageId,
      user_id: user.id,
      notes,
      verdict,
      tasted_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath("/journal")
  return data
}

export async function getUserTastings() {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("tastings")
    .select(`
      *,
      vintage:vintages(
        year,
        wine:wines(
          name,
          producer:producers(name),
          vintages(
            wine_varietals(
              percent,
              varietal:grape_varietals(name)
            )
          )
        )
      )
    `)
    .eq("user_id", user.id)
    .order("tasted_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getRegionsWithProducers() {
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from("regions")
    .select(`
      *,
      climate_zone:climate_zones(name, koppen),
      producers(count)
    `)
    .order("name")

  if (error) throw error
  return data
}

export async function getProducersByRegion(regionId: string) {
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from("producers")
    .select(`
      *,
      wines(count),
      region:regions(name, country)
    `)
    .eq("region_id", regionId)
    .order("name")

  if (error) throw error
  return data
}

export async function getWineEducation(vintageId: string) {
  const supabase = await createServerSupabase()

  // Get comprehensive educational information about a wine
  const { data: vintage, error } = await supabase
    .from("vintages")
    .select(`
      *,
      wine:wines(
        name,
        is_nv,
        producer:producers(
          name,
          website,
          region:regions(
            name,
            country,
            climate_zone:climate_zones(
              name,
              koppen,
              notes
            )
          )
        )
      ),
      soil_type:soil_types(name, description),
      climate_zone:climate_zones(name, koppen, notes),
      wine_varietals(
        percent,
        varietal:grape_varietals(
          name,
          parent_a_varietal:parent_a(name),
          parent_b_varietal:parent_b(name)
        )
      )
    `)
    .eq("id", vintageId)
    .single()

  if (error) throw error

  // Format educational content
  return {
    wine: vintage.wine,
    vintage: {
      year: vintage.year,
      abv: vintage.abv
    },
    terroir: {
      soil: vintage.soil_type,
      climate: vintage.climate_zone,
      region: vintage.wine?.producer?.region
    },
    varietals: (vintage.wine_varietals as Array<{ percent: number | null; varietal: { name: string } }>).map((wv) => ({
      name: wv.varietal.name,
      percent: wv.percent,
      parents: []
    })),
    education: {
      soilImpact: generateSoilEducation(vintage.soil_type),
      climateImpact: generateClimateEducation(vintage.climate_zone),
      varietalHistory: generateVarietalHistory(vintage.wine_varietals as unknown as Array<{ varietal: { name: string; parent_a_varietal?: { name: string } | null; parent_b_varietal?: { name: string } | null } }>)
    }
  }
}

function generateSoilEducation(soilType: { name: string; description: string | null } | null) {
  if (!soilType) return null

  const soilEducation: Record<string, string> = {
    "Limestone": "Limestone soils provide excellent drainage and force vines to develop deep root systems. The high calcium content contributes to wines with bright acidity and mineral notes.",
    "Clay": "Clay soils retain water well, helping vines during dry periods. They produce wines with deeper color, fuller body, and more tannic structure.",
    "Gravel": "Gravel soils offer superior drainage and heat retention. The stones reflect sunlight onto grape clusters, aiding ripening and producing concentrated, powerful wines.",
    "Volcanic": "Volcanic soils are rich in minerals and create wines with distinctive smoky, mineral characteristics. The porous nature provides excellent drainage.",
    "Sandstone": "Sandstone combines good drainage with moderate water retention. It produces elegant wines with fine tannins and aromatic complexity.",
    "Schist": "Schist's layered structure allows vine roots to penetrate deeply. It contributes to wines with pronounced minerality and age-worthiness."
  }

  return soilEducation[soilType.name] || soilType.description
}

function generateClimateEducation(climateZone: { name: string; koppen: string; notes: string | null } | null) {
  if (!climateZone) return null

  return climateZone.notes || `The ${climateZone.name} climate (${climateZone.koppen}) influences grape ripening patterns and wine style.`
}

function generateVarietalHistory(wineVarietals: Array<{ varietal: { name: string; parent_a_varietal?: { name: string } | null; parent_b_varietal?: { name: string } | null } }>) {
  return wineVarietals.map((wv) => {
    const history = []
    if (wv.varietal.parent_a_varietal || wv.varietal.parent_b_varietal) {
      history.push(`${wv.varietal.name} is a cross between ${[wv.varietal.parent_a_varietal?.name, wv.varietal.parent_b_varietal?.name].filter(Boolean).join(" and ")}.`)
    }
    return history.join(" ")
  }).filter(Boolean).join(" ")
}