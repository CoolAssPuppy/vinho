// Mock the Supabase boundary so we can exercise StatsService's real mapping and
// display-formatting behavior without a live database.
const mockSingle = jest.fn();

jest.mock("@/lib/supabase", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        single: mockSingle,
      }),
    }),
  }),
}));

import { StatsService } from "@/lib/stats-service";

const getMockStatsRow = (overrides?: Record<string, unknown>) => ({
  unique_wines: 12,
  total_tastings: 30,
  unique_producers: 9,
  unique_regions: 8,
  unique_countries: 5,
  favorites: 3,
  average_rating: 4.7,
  tastings_last_30_days: 7,
  last_tasting_date: "2026-07-01",
  ...overrides,
});

describe("StatsService.fetchUserStats", () => {
  beforeEach(() => mockSingle.mockReset());

  it("maps the stats view row into WineStats", async () => {
    mockSingle.mockResolvedValue({ data: getMockStatsRow(), error: null });
    const stats = await new StatsService().fetchUserStats();
    expect(stats).toEqual({
      uniqueWines: 12,
      totalTastings: 30,
      uniqueProducers: 9,
      uniqueRegions: 8,
      uniqueCountries: 5,
      favorites: 3,
      averageRating: 4.7,
      tastingsLast30Days: 7,
      lastTastingDate: "2026-07-01",
    });
  });

  it("coerces missing numeric fields to 0", async () => {
    mockSingle.mockResolvedValue({
      data: getMockStatsRow({ unique_wines: null, total_tastings: undefined }),
      error: null,
    });
    const stats = await new StatsService().fetchUserStats();
    expect(stats?.uniqueWines).toBe(0);
    expect(stats?.totalTastings).toBe(0);
  });

  it("returns null when the query errors", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    const stats = await new StatsService().fetchUserStats();
    expect(stats).toBeNull();
  });
});

describe("StatsService.getDisplayStats", () => {
  beforeEach(() => mockSingle.mockReset());

  it("formats stats into the display shape", async () => {
    mockSingle.mockResolvedValue({ data: getMockStatsRow(), error: null });
    const display = await new StatsService().getDisplayStats();
    expect(display).toEqual({
      wines: { value: 12, label: "Wines", subtitle: "30 tastings" },
      countries: { value: 5, label: "Countries", subtitle: "8 regions" },
      rating: { value: "4.7", label: "Avg Rating", subtitle: "3 favorites" },
      recent: { value: 7, label: "This Month", subtitle: "tastings" },
    });
  });

  it("shows 0.0 rating when average is null", async () => {
    mockSingle.mockResolvedValue({
      data: getMockStatsRow({ average_rating: null }),
      error: null,
    });
    const display = await new StatsService().getDisplayStats();
    expect(display?.rating.value).toBe("0.0");
  });

  it("returns null when stats can't be fetched", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await new StatsService().getDisplayStats()).toBeNull();
  });
});
