import {
  mapSearchResultToTasting,
  mapSearchResultsToTastings,
} from "@/lib/mappers/search-result-mapper";

interface SearchResultInput {
  tasting_id: string;
  verdict: number | null;
  notes: string | null;
  location_name: string | null;
  vintage_year: number | null;
  wine_name: string | null;
  producer_name: string | null;
}

const getMockSearchResult = (
  overrides?: Partial<SearchResultInput>,
): SearchResultInput => ({
  tasting_id: "t-1",
  verdict: 4,
  notes: "Lovely",
  location_name: "Home",
  vintage_year: 2019,
  wine_name: "Barolo",
  producer_name: "Vietti",
  ...overrides,
});

describe("mapSearchResultToTasting", () => {
  it("maps flat search fields onto the nested tasting shape", () => {
    const result = mapSearchResultToTasting(getMockSearchResult());
    expect(result.id).toBe("t-1");
    expect(result.verdict).toBe(4);
    expect(result.notes).toBe("Lovely");
    expect(result.location_name).toBe("Home");
    expect(result.vintage?.year).toBe(2019);
    expect(result.vintage?.wine?.name).toBe("Barolo");
    expect(result.vintage?.wine?.producer?.name).toBe("Vietti");
  });

  it("substitutes placeholder names when wine/producer are null", () => {
    const result = mapSearchResultToTasting(
      getMockSearchResult({ wine_name: null, producer_name: null }),
    );
    expect(result.vintage?.wine?.name).toBe("Unknown Wine");
    expect(result.vintage?.wine?.producer?.name).toBe("Unknown Producer");
  });

  it("defaults tasted_at to a YYYY-MM-DD date string", () => {
    const result = mapSearchResultToTasting(getMockSearchResult());
    expect(result.tasted_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("preserves null verdict and notes", () => {
    const result = mapSearchResultToTasting(
      getMockSearchResult({ verdict: null, notes: null }),
    );
    expect(result.verdict).toBeNull();
    expect(result.notes).toBeNull();
  });
});

describe("mapSearchResultsToTastings", () => {
  it("maps each result in order", () => {
    const results = mapSearchResultsToTastings([
      getMockSearchResult({ tasting_id: "a" }),
      getMockSearchResult({ tasting_id: "b" }),
    ]);
    expect(results.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("returns an empty array for no results", () => {
    expect(mapSearchResultsToTastings([])).toEqual([]);
  });
});
