import {
  parseCSVLine,
  parseVivinoCSV,
  applyRatingRules,
  normalizeWineType,
  processVivinoEntry,
  groupWinesByProducer,
  extractUniqueRegions,
  generateIdempotencyKey,
  batchEntries,
  type VivinoWineEntry,
} from "@/app/lib/vivino-migration";

const getMockEntry = (overrides?: Partial<VivinoWineEntry>): VivinoWineEntry => ({
  winery: "Planeta",
  wineName: "Etna Bianco",
  vintage: "2018",
  region: "Etna",
  country: "Italy",
  regionalWineStyle: "Italian White",
  averageRating: "4.2",
  scanDate: "2024-01-15",
  scanReviewLocation: "Home",
  yourRating: "",
  yourReview: "Bright and mineral",
  personalNote: "With seafood",
  wineType: "White wine",
  drinkingWindow: "",
  linkToWine: "https://vivino.com/w/123",
  labelImage: "https://images.vivino.com/123.jpg",
  ...overrides,
});

describe("parseCSVLine", () => {
  it("splits a plain comma-separated line", () => {
    expect(parseCSVLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("keeps commas that sit inside quotes", () => {
    expect(parseCSVLine('"Smith, John",red,2019')).toEqual([
      "Smith, John",
      "red",
      "2019",
    ]);
  });

  it("treats a doubled quote inside quotes as an escaped quote", () => {
    expect(parseCSVLine('"a ""b"" c",d')).toEqual(['a "b" c', "d"]);
  });

  it("returns a trailing empty field for a dangling comma", () => {
    expect(parseCSVLine("a,")).toEqual(["a", ""]);
  });
});

describe("parseVivinoCSV", () => {
  const makeRow = (fields: string[]) => fields.join(",");
  const header = makeRow(Array.from({ length: 16 }, (_, i) => `col${i}`));
  const validRow = makeRow([
    "Planeta", "Etna Bianco", "2018", "Etna", "Italy", "White",
    "4.2", "2024-01-15", "Home", "", "", "", "White wine", "", "url", "img",
  ]);

  it("skips the header and parses data rows", () => {
    const entries = parseVivinoCSV(`${header}\n${validRow}`);
    expect(entries).toHaveLength(1);
    expect(entries[0].winery).toBe("Planeta");
    expect(entries[0].country).toBe("Italy");
  });

  it("throws when there are fewer than two lines", () => {
    expect(() => parseVivinoCSV(header)).toThrow("CSV file is empty or invalid");
  });

  it("skips rows with fewer than 16 columns", () => {
    const shortRow = makeRow(["only", "three", "cols"]);
    const entries = parseVivinoCSV(`${header}\n${shortRow}\n${validRow}`);
    expect(entries).toHaveLength(1);
  });

  it("ignores blank lines", () => {
    const entries = parseVivinoCSV(`${header}\n\n${validRow}\n   \n`);
    expect(entries).toHaveLength(1);
  });
});

describe("applyRatingRules", () => {
  it("rates Sicilian wines 5", () => {
    expect(applyRatingRules(getMockEntry({ country: "Italy", region: "Etna" }))).toBe(5);
    expect(applyRatingRules(getMockEntry({ country: "Italy", region: "Marsala" }))).toBe(5);
  });

  it("does not treat non-Italian 'etna'-like regions as Sicilian", () => {
    expect(applyRatingRules(getMockEntry({ country: "France", region: "Etna" }))).toBe(4);
  });

  it("rates Sancerre whites 5 but Sancerre reds 4", () => {
    expect(
      applyRatingRules(getMockEntry({ region: "Sancerre", wineType: "White wine", country: "France" })),
    ).toBe(5);
    expect(
      applyRatingRules(getMockEntry({ region: "Sancerre", wineType: "Red wine", country: "France" })),
    ).toBe(4);
  });

  it("defaults everything else to 4", () => {
    expect(applyRatingRules(getMockEntry({ country: "Spain", region: "Rioja", wineType: "Red wine" }))).toBe(4);
  });
});

describe("normalizeWineType", () => {
  it.each([
    ["Sparkling wine", "sparkling"],
    ["Dessert wine", "dessert"],
    ["Sweet wine", "dessert"],
    ["Fortified", "fortified"],
    ["Port", "fortified"],
    ["Sherry", "fortified"],
    ["Rosé wine", "rose"],
    ["Rose", "rose"],
    ["White wine", "white"],
    ["Red wine", "red"],
    ["something unknown", "red"],
  ])("maps %p to %p", (input, expected) => {
    expect(normalizeWineType(input)).toBe(expected);
  });
});

describe("processVivinoEntry", () => {
  it("parses a valid 4-digit vintage year", () => {
    const result = processVivinoEntry(getMockEntry({ vintage: "2018" }));
    expect(result.vintage.year).toBe(2018);
    expect(result.wine.isNV).toBe(false);
  });

  it("treats a missing/invalid vintage as non-vintage (NV)", () => {
    const result = processVivinoEntry(getMockEntry({ vintage: "" }));
    expect(result.vintage.year).toBeNull();
    expect(result.wine.isNV).toBe(true);
  });

  it("rejects an out-of-range year", () => {
    expect(processVivinoEntry(getMockEntry({ vintage: "1700" })).vintage.year).toBeNull();
  });

  it("combines review and personal note into notes", () => {
    const result = processVivinoEntry(
      getMockEntry({ yourReview: "Bright", personalNote: "With fish" }),
    );
    expect(result.tasting.notes).toBe("Bright\nWith fish");
  });

  it("returns null notes when review and note are both empty", () => {
    const result = processVivinoEntry(getMockEntry({ yourReview: "", personalNote: "" }));
    expect(result.tasting.notes).toBeNull();
  });

  it("falls back to placeholder names when winery/wine are blank", () => {
    const result = processVivinoEntry(getMockEntry({ winery: "", wineName: "" }));
    expect(result.producer.name).toBe("Unknown Producer");
    expect(result.wine.name).toBe("Unknown Wine");
  });
});

describe("groupWinesByProducer", () => {
  it("groups entries sharing producer/country/region", () => {
    const a = processVivinoEntry(getMockEntry({ winery: "Planeta" }));
    const b = processVivinoEntry(getMockEntry({ winery: "Planeta" }));
    const c = processVivinoEntry(getMockEntry({ winery: "Gaja", region: "Barbaresco" }));
    const grouped = groupWinesByProducer([a, b, c]);
    expect(grouped.size).toBe(2);
    expect(grouped.get("Planeta|Italy|Etna")).toHaveLength(2);
  });
});

describe("extractUniqueRegions", () => {
  it("collects region|country keys, deduped, skipping blanks", () => {
    const a = processVivinoEntry(getMockEntry({ region: "Etna", country: "Italy" }));
    const b = processVivinoEntry(getMockEntry({ region: "Etna", country: "Italy" }));
    const c = processVivinoEntry(getMockEntry({ region: "", country: "Italy" }));
    const regions = extractUniqueRegions([a, b, c]);
    expect(regions.has("Etna|Italy")).toBe(true);
    expect(regions.size).toBe(1);
  });
});

describe("generateIdempotencyKey", () => {
  it("is stable for the same wine and user", () => {
    const entry = processVivinoEntry(getMockEntry());
    expect(generateIdempotencyKey(entry, "user-1")).toBe(
      generateIdempotencyKey(entry, "user-1"),
    );
  });

  it("differs by user", () => {
    const entry = processVivinoEntry(getMockEntry());
    expect(generateIdempotencyKey(entry, "user-1")).not.toBe(
      generateIdempotencyKey(entry, "user-2"),
    );
  });

  it("lowercases and strips non-alphanumeric (except pipes)", () => {
    const entry = processVivinoEntry(getMockEntry());
    const key = generateIdempotencyKey(entry, "User-1");
    expect(key).toBe(key.toLowerCase());
    expect(key).not.toMatch(/[^a-z0-9|]/);
  });
});

describe("batchEntries", () => {
  it("splits into batches of the given size", () => {
    expect(batchEntries([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single batch when smaller than the size", () => {
    expect(batchEntries([1, 2], 10)).toEqual([[1, 2]]);
  });

  it("returns no batches for an empty list", () => {
    expect(batchEntries([], 10)).toEqual([]);
  });
});
