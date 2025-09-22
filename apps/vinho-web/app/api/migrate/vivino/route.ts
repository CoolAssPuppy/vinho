import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  parseVivinoCSV,
  processVivinoEntry,
  groupWinesByProducer,
  extractUniqueRegions,
  generateIdempotencyKey,
  batchEntries,
  type MigrationProgress,
  type ProcessedWineData,
} from "@/app/lib/vivino-migration";
import { generateEmbedding, generateTastingSearchText } from "@/lib/embeddings";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large imports

interface MigrationResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  details?: {
    producers: number;
    wines: number;
    vintages: number;
    tastings: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 },
      );
    }

    // Read file content
    const content = await file.text();

    // Parse CSV
    const vivinoEntries = parseVivinoCSV(content);

    if (vivinoEntries.length === 0) {
      return NextResponse.json(
        { error: "No valid entries found in CSV" },
        { status: 400 },
      );
    }

    // TEST: Only process first 3 entries for testing
    const testEntries = vivinoEntries.slice(0, 3);
    console.log(
      `Testing with first 3 entries out of ${vivinoEntries.length} total`,
    );

    // Process entries
    const processedEntries = testEntries
      .filter((entry) => entry.winery || entry.wineName) // Skip completely empty entries
      .map(processVivinoEntry);

    // Get Supabase client
    const supabase = await createServerSupabase();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Group wines by producer for efficient processing
    const groupedByProducer = groupWinesByProducer(processedEntries);

    // Extract unique regions for batch creation
    const uniqueRegions = extractUniqueRegions(processedEntries);

    // Migration statistics
    const stats = {
      totalEntries: processedEntries.length,
      uniqueProducers: groupedByProducer.size,
      uniqueRegions: uniqueRegions.size,
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Step 1: Create regions
    const regionMap = new Map<string, string>(); // region|country -> region_id

    for (const regionKey of uniqueRegions) {
      const [regionName, country] = regionKey.split("|");

      try {
        // Check if region exists
        const { data: existingRegion } = await supabase
          .from("regions")
          .select("id")
          .eq("name", regionName)
          .eq("country", country)
          .single();

        if (existingRegion) {
          regionMap.set(regionKey, existingRegion.id);
        } else {
          // Create new region
          const { data: newRegion, error } = await supabase
            .from("regions")
            .insert({
              name: regionName,
              country: country,
            })
            .select("id")
            .single();

          if (error) {
            console.error(`Failed to create region ${regionName}:`, error);
          } else if (newRegion) {
            regionMap.set(regionKey, newRegion.id);
          }
        }
      } catch (error) {
        console.error(`Error processing region ${regionKey}:`, error);
      }
    }

    // Step 2: Process producers and their wines
    const producerMap = new Map<string, string>(); // producer key -> producer_id

    for (const [producerKey, wines] of groupedByProducer) {
      const [producerName, country, region] = producerKey.split("|");

      try {
        // Check if producer exists
        let producerId: string;
        const { data: existingProducer } = await supabase
          .from("producers")
          .select("id")
          .eq("name", producerName)
          .maybeSingle();

        if (existingProducer) {
          producerId = existingProducer.id;
        } else {
          // Get region ID if available
          const regionId = regionMap.get(`${region}|${country}`);

          // Create new producer
          const { data: newProducer, error } = await supabase
            .from("producers")
            .insert({
              name: producerName,
              region_id: regionId || null,
            })
            .select("id")
            .single();

          if (error) {
            console.error(`Failed to create producer ${producerName}:`, error);
            stats.errors.push(`Producer ${producerName}: ${error.message}`);
            stats.failed += wines.length;
            continue;
          }

          producerId = newProducer.id;
        }

        producerMap.set(producerKey, producerId);

        // Step 3: Process wines for this producer
        for (const wineData of wines) {
          try {
            // Check for existing wine
            const { data: existingWine } = await supabase
              .from("wines")
              .select("id")
              .eq("name", wineData.wine.name)
              .eq("producer_id", producerId)
              .maybeSingle();

            let wineId: string;

            if (existingWine) {
              wineId = existingWine.id;
            } else {
              // Create new wine
              const { data: newWine, error } = await supabase
                .from("wines")
                .insert({
                  name: wineData.wine.name,
                  producer_id: producerId,
                  is_nv: wineData.wine.isNV,
                })
                .select("id")
                .single();

              if (error) {
                console.error(
                  `Failed to create wine ${wineData.wine.name}:`,
                  error,
                );
                stats.errors.push(
                  `Wine ${wineData.wine.name}: ${error.message}`,
                );
                stats.failed++;
                continue;
              }

              wineId = newWine.id;
            }

            // Step 4: Create or find vintage
            let vintageId: string | null = null;

            if (!wineData.wine.isNV) {
              const { data: existingVintage } = await supabase
                .from("vintages")
                .select("id")
                .eq("wine_id", wineId)
                .eq("year", wineData.vintage.year!)
                .maybeSingle();

              if (existingVintage) {
                vintageId = existingVintage.id;
              } else {
                const { data: newVintage, error } = await supabase
                  .from("vintages")
                  .insert({
                    wine_id: wineId,
                    year: wineData.vintage.year,
                  })
                  .select("id")
                  .single();

                if (error) {
                  console.error(`Failed to create vintage:`, error);
                  stats.errors.push(
                    `Vintage ${wineData.vintage.year}: ${error.message}`,
                  );
                  stats.failed++;
                  continue;
                }

                vintageId = newVintage.id;
              }
            }

            // Step 5: Create tasting record
            if (vintageId || wineData.wine.isNV) {
              // For NV wines, create a vintage entry with null year
              if (!vintageId && wineData.wine.isNV) {
                const { data: nvVintage, error } = await supabase
                  .from("vintages")
                  .insert({
                    wine_id: wineId,
                    year: null,
                  })
                  .select("id")
                  .single();

                if (!error && nvVintage) {
                  vintageId = nvVintage.id;
                }
              }

              if (vintageId) {
                // Check for duplicate tasting (same wine, same date)
                const { data: existingTasting } = await supabase
                  .from("tastings")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("vintage_id", vintageId)
                  .eq(
                    "tasted_at",
                    wineData.tasting.tastedAt.toISOString().split("T")[0],
                  )
                  .maybeSingle();

                if (!existingTasting) {
                  // Generate search text and embedding for the tasting
                  const searchText = generateTastingSearchText({
                    notes: wineData.tasting.notes || undefined,
                    location: wineData.tasting.locationName || undefined,
                    wineName: wineData.wine.name,
                    producerName: producerName,
                    regionName: region,
                    country: country,
                    vintage: wineData.vintage.year,
                    rating: wineData.tasting.rating,
                    wineType: wineData.metadata.regionalStyle || undefined,
                  });

                  let embedding: number[] | null = null;
                  try {
                    embedding = await generateEmbedding(searchText);
                  } catch (error) {
                    console.error("Failed to generate embedding:", error);
                    // Continue without embedding - text search will still work
                  }

                  const { error: tastingError } = await supabase
                    .from("tastings")
                    .insert({
                      user_id: user.id,
                      vintage_id: vintageId,
                      verdict: wineData.tasting.rating,
                      notes: wineData.tasting.notes,
                      tasted_at: wineData.tasting.tastedAt
                        .toISOString()
                        .split("T")[0],
                      location_name: wineData.tasting.locationName,
                      image_url: wineData.metadata.vivinoImageUrl,
                      search_text: searchText,
                      embedding: embedding,
                    });

                  if (tastingError) {
                    console.error("Failed to create tasting:", tastingError);
                    stats.errors.push(`Tasting: ${tastingError.message}`);
                    stats.failed++;
                  } else {
                    stats.imported++;
                  }
                } else {
                  // Skip duplicate
                  console.log(
                    `Skipping duplicate tasting for ${wineData.wine.name}`,
                  );
                  stats.imported++; // Count as success since it exists
                }
              }
            }

            // Step 6: Queue for enrichment if image exists
            if (wineData.metadata.vivinoImageUrl) {
              const idempotencyKey = generateIdempotencyKey(wineData, user.id);

              // Add to wines_added for processing
              await supabase.from("wines_added").insert({
                user_id: user.id,
                image_url: wineData.metadata.vivinoImageUrl,
                status: "pending",
                idempotency_key: idempotencyKey,
                processed_data: {
                  source: "vivino_migration",
                  original_url: wineData.metadata.vivinoUrl,
                  producer_name: producerName,
                  wine_name: wineData.wine.name,
                  vintage_year: wineData.vintage.year,
                  regional_style: wineData.metadata.regionalStyle,
                },
              });
            }
          } catch (error) {
            console.error("Error processing wine:", error);
            stats.errors.push(`Processing error: ${error}`);
            stats.failed++;
          }
        }
      } catch (error) {
        console.error(`Error processing producer ${producerName}:`, error);
        stats.errors.push(`Producer processing error: ${error}`);
        stats.failed += wines.length;
      }
    }

    // Return migration results
    const result: MigrationResult = {
      success: stats.imported > 0,
      imported: stats.imported,
      failed: stats.failed,
      errors: stats.errors.slice(0, 10), // Limit errors in response
      details: {
        producers: producerMap.size,
        wines: stats.imported + stats.failed,
        vintages: stats.imported,
        tastings: stats.imported,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
