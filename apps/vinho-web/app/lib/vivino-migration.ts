// Vivino Migration Types and Utilities

export interface VivinoWineEntry {
  winery: string;
  wineName: string;
  vintage: string;
  region: string;
  country: string;
  regionalWineStyle: string;
  averageRating: string;
  scanDate: string;
  scanReviewLocation: string;
  yourRating: string;
  yourReview: string;
  personalNote: string;
  wineType: string;
  drinkingWindow: string;
  linkToWine: string;
  labelImage: string;
}

export interface MigrationProgress {
  total: number;
  processed: number;
  failed: number;
  stage:
    | "parsing"
    | "validating"
    | "importing"
    | "enriching"
    | "complete"
    | "error";
  currentItem?: string;
  errors: string[];
}

export interface ProcessedWineData {
  producer: {
    name: string;
    country: string;
    region: string;
  };
  wine: {
    name: string;
    type: "red" | "white" | "rose" | "sparkling" | "dessert" | "fortified";
    isNV: boolean;
  };
  vintage: {
    year: number | null;
  };
  tasting: {
    rating: number;
    notes: string | null;
    tastedAt: Date;
    locationName: string | null;
  };
  metadata: {
    vivinoUrl: string;
    vivinoImageUrl: string;
    vivinoAvgRating: number;
    regionalStyle: string;
  };
}

// Parse CSV line handling quotes and commas
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// Parse Vivino CSV export
export function parseVivinoCSV(csvContent: string): VivinoWineEntry[] {
  const lines = csvContent.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV file is empty or invalid");
  }

  // Skip header
  const entries: VivinoWineEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length < 16) {
      console.warn(`Skipping invalid line ${i + 1}: insufficient columns`);
      continue;
    }

    entries.push({
      winery: values[0]?.trim() || "",
      wineName: values[1]?.trim() || "",
      vintage: values[2]?.trim() || "",
      region: values[3]?.trim() || "",
      country: values[4]?.trim() || "",
      regionalWineStyle: values[5]?.trim() || "",
      averageRating: values[6]?.trim() || "",
      scanDate: values[7]?.trim() || "",
      scanReviewLocation: values[8]?.trim() || "",
      yourRating: values[9]?.trim() || "",
      yourReview: values[10]?.trim() || "",
      personalNote: values[11]?.trim() || "",
      wineType: values[12]?.trim() || "",
      drinkingWindow: values[13]?.trim() || "",
      linkToWine: values[14]?.trim() || "",
      labelImage: values[15]?.trim() || "",
    });
  }

  return entries;
}

// Apply rating rules: Sicily or Sancerre whites = 5, everything else = 4
export function applyRatingRules(entry: VivinoWineEntry): number {
  const region = entry.region?.toLowerCase() || "";
  const country = entry.country?.toLowerCase() || "";
  const wineType = entry.wineType?.toLowerCase() || "";

  // Check for Sicily (various spellings/regions)
  const isSicilian =
    country.includes("italy") &&
    (region.includes("sicil") ||
      region.includes("etna") ||
      region.includes("marsala") ||
      region.includes("pantelleria") ||
      region.includes("cerasuolo"));

  // Check for Sancerre whites
  const isSancerreWhite =
    region.includes("sancerre") && wineType.includes("white");

  return isSicilian || isSancerreWhite ? 5 : 4;
}

// Convert wine type string to our enum
export function normalizeWineType(
  wineType: string,
): ProcessedWineData["wine"]["type"] {
  const type = wineType.toLowerCase();

  if (type.includes("sparkling")) return "sparkling";
  if (type.includes("dessert") || type.includes("sweet")) return "dessert";
  if (
    type.includes("fortified") ||
    type.includes("port") ||
    type.includes("sherry")
  )
    return "fortified";
  if (type.includes("rosé") || type.includes("rose")) return "rose";
  if (type.includes("white")) return "white";
  if (type.includes("red")) return "red";

  // Default to red if unknown
  return "red";
}

// Process Vivino entry into our format
export function processVivinoEntry(entry: VivinoWineEntry): ProcessedWineData {
  // Parse vintage year
  let vintageYear: number | null = null;
  if (entry.vintage && /^\d{4}$/.test(entry.vintage)) {
    vintageYear = parseInt(entry.vintage);
    // Validate year is reasonable (1800-current year + 1)
    const currentYear = new Date().getFullYear();
    if (vintageYear < 1800 || vintageYear > currentYear + 1) {
      vintageYear = null;
    }
  }

  // Parse scan date
  const scanDate = entry.scanDate ? new Date(entry.scanDate) : new Date();

  // Apply rating rules
  const rating = applyRatingRules(entry);

  // Combine review and personal note
  const notes =
    [entry.yourReview, entry.personalNote].filter(Boolean).join("\n").trim() ||
    null;

  // Parse average rating
  const avgRating = parseFloat(entry.averageRating) || 0;

  return {
    producer: {
      name: entry.winery || "Unknown Producer",
      country: entry.country || "",
      region: entry.region || "",
    },
    wine: {
      name: entry.wineName || "Unknown Wine",
      type: normalizeWineType(entry.wineType),
      isNV: !vintageYear,
    },
    vintage: {
      year: vintageYear,
    },
    tasting: {
      rating,
      notes,
      tastedAt: scanDate,
      locationName: entry.scanReviewLocation || null,
    },
    metadata: {
      vivinoUrl: entry.linkToWine || "",
      vivinoImageUrl: entry.labelImage || "",
      vivinoAvgRating: avgRating,
      regionalStyle: entry.regionalWineStyle || "",
    },
  };
}

// Group wines by producer for efficient processing
export function groupWinesByProducer(
  entries: ProcessedWineData[],
): Map<string, ProcessedWineData[]> {
  const grouped = new Map<string, ProcessedWineData[]>();

  for (const entry of entries) {
    const key = `${entry.producer.name}|${entry.producer.country}|${entry.producer.region}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(entry);
  }

  return grouped;
}

// Extract unique regions for batch creation
export function extractUniqueRegions(
  entries: ProcessedWineData[],
): Set<string> {
  const regions = new Set<string>();

  for (const entry of entries) {
    if (entry.producer.region && entry.producer.country) {
      regions.add(`${entry.producer.region}|${entry.producer.country}`);
    }
  }

  return regions;
}

// Generate idempotency key for wine import
export function generateIdempotencyKey(
  entry: ProcessedWineData,
  userId: string,
): string {
  const parts = [
    userId,
    entry.producer.name,
    entry.wine.name,
    entry.vintage.year || "NV",
    entry.metadata.vivinoUrl,
  ];

  return parts
    .join("|")
    .toLowerCase()
    .replace(/[^a-z0-9|]/g, "");
}

// Batch entries for processing (to avoid overwhelming the API)
export function batchEntries<T>(entries: T[], batchSize: number = 10): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < entries.length; i += batchSize) {
    batches.push(entries.slice(i, i + batchSize));
  }

  return batches;
}
