// Test script for Vivino migration
const fs = require("fs");

// Read the CSV file
const csvContent = fs.readFileSync(
  "/Users/prashant/Developer/vinho/scripts/full_wine_list.csv",
  "utf8",
);

// Parse CSV
function parseCSVLine(line) {
  const result = [];
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

const lines = csvContent.split("\n").filter((line) => line.trim());
console.log(`Total lines: ${lines.length}`);

// Parse header
const header = parseCSVLine(lines[0]);
console.log("\nHeader columns:", header);

// Count statistics
let withWinery = 0;
let withRating = 0;
let withReview = 0;
let sicilianWines = 0;
let sancerreWhites = 0;
let uniqueCountries = new Set();
let uniqueRegions = new Set();
let uniqueProducers = new Set();

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);

  if (values[0]?.trim()) {
    withWinery++;
    uniqueProducers.add(values[0].trim());
  }

  if (values[9]?.trim()) withRating++;
  if (values[10]?.trim()) withReview++;

  const region = values[3]?.toLowerCase() || "";
  const country = values[4]?.toLowerCase() || "";
  const wineType = values[12]?.toLowerCase() || "";

  if (country) uniqueCountries.add(values[4]);
  if (region) uniqueRegions.add(values[3]);

  // Check for Sicily
  if (
    country.includes("italy") &&
    (region.includes("sicil") ||
      region.includes("etna") ||
      region.includes("marsala") ||
      region.includes("cerasuolo"))
  ) {
    sicilianWines++;
  }

  // Check for Sancerre whites
  if (region.includes("sancerre") && wineType.includes("white")) {
    sancerreWhites++;
  }
}

console.log("\n=== MIGRATION STATISTICS ===");
console.log(`Total wines: ${lines.length - 1}`);
console.log(`Wines with winery: ${withWinery}`);
console.log(`Wines with your rating: ${withRating}`);
console.log(`Wines with your review: ${withReview}`);
console.log(`Unique producers: ${uniqueProducers.size}`);
console.log(`Unique countries: ${uniqueCountries.size}`);
console.log(`Unique regions: ${uniqueRegions.size}`);
console.log(`\nRating distribution:`);
console.log(`- Sicilian wines (5 stars): ${sicilianWines}`);
console.log(`- Sancerre whites (5 stars): ${sancerreWhites}`);
console.log(
  `- All others (4 stars): ${lines.length - 1 - sicilianWines - sancerreWhites}`,
);

// Show sample entries
console.log("\n=== SAMPLE ENTRIES ===");
for (let i = 1; i <= 3; i++) {
  const values = parseCSVLine(lines[i]);
  console.log(`\nEntry ${i}:`);
  console.log(`  Winery: ${values[0] || "(none)"}`);
  console.log(`  Wine: ${values[1] || "(none)"}`);
  console.log(`  Vintage: ${values[2] || "NV"}`);
  console.log(`  Region: ${values[3]} (${values[4]})`);
  console.log(`  Type: ${values[12]}`);
  console.log(`  Your Rating: ${values[9] || "(none)"}`);
}
