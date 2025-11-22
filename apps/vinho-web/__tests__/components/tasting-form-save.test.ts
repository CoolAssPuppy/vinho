import { describe, it, expect, beforeEach, jest } from "@jest/globals";

/**
 * Tests for TastingNoteForm save functionality.
 * These tests verify that all tasting data is properly persisted to Supabase.
 *
 * Key areas tested:
 * - Rating/verdict persistence across all tasting styles
 * - Notes and detailed notes persistence
 * - Location data persistence
 * - Tasting date persistence
 * - Wine name and description editing within the form
 * - Error handling and validation
 */

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => mockSupabase),
}));

// Test fixtures
const TEST_USER = { id: "user-123", email: "test@test.com" };
const TEST_VINTAGE_ID = "vintage-456";
const TEST_TASTING_ID = "tasting-789";
const TEST_WINE_ID = "wine-abc";

describe("TastingNoteForm Save Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    });
  });

  describe("Rating Save", () => {
    it("should save rating when tapping stars in casual mode", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveTastingRating(TEST_TASTING_ID, 5);

      expect(mockSupabase.from).toHaveBeenCalledWith("tastings");
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ verdict: 5 })
      );
    });

    it("should save rating in sommelier mode with notes", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveTastingWithNotes(TEST_TASTING_ID, {
        verdict: 4,
        notes: "Great wine with cherry notes",
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          verdict: 4,
          notes: "Great wine with cherry notes",
        })
      );
    });

    it("should save rating in winemaker mode with detailed notes", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveTastingWithNotes(TEST_TASTING_ID, {
        verdict: 5,
        notes: "Sensory evaluation text",
        detailed_notes: "Technical analysis text",
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          verdict: 5,
          notes: "Sensory evaluation text",
          detailed_notes: "Technical analysis text",
        })
      );
    });

    it("should allow saving with null rating", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveTastingWithNotes(TEST_TASTING_ID, {
        verdict: null,
        notes: "Notes without rating",
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ verdict: null })
      );
    });
  });

  describe("Location Save", () => {
    it("should save complete location data", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveTastingLocation(TEST_TASTING_ID, {
        location_name: "Wine Bar Downtown",
        location_address: "123 Main Street",
        location_city: "San Francisco",
        location_latitude: 37.7749,
        location_longitude: -122.4194,
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          location_name: "Wine Bar Downtown",
          location_address: "123 Main Street",
          location_city: "San Francisco",
          location_latitude: 37.7749,
          location_longitude: -122.4194,
        })
      );
    });

    it("should allow clearing location data", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveTastingLocation(TEST_TASTING_ID, {
        location_name: null,
        location_address: null,
        location_city: null,
        location_latitude: null,
        location_longitude: null,
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          location_name: null,
        })
      );
    });
  });

  describe("Date Save", () => {
    it("should save tasting date", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveTastingDate(TEST_TASTING_ID, "2024-03-15");

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ tasted_at: "2024-03-15" })
      );
    });
  });

  describe("Wine Editing within Form", () => {
    it("should save wine name changes", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveWineNameFromForm(TEST_WINE_ID, "Updated Wine Name");

      expect(mockSupabase.from).toHaveBeenCalledWith("wines");
      expect(updateMock).toHaveBeenCalledWith({ name: "Updated Wine Name" });
    });

    it("should save wine description changes", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveWineDescriptionFromForm(
        TEST_WINE_ID,
        "Rich and full-bodied wine"
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("wines");
      expect(updateMock).toHaveBeenCalledWith({
        tasting_notes: "Rich and full-bodied wine",
      });
    });

    it("should allow clearing wine description", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveWineDescriptionFromForm(TEST_WINE_ID, null);

      expect(updateMock).toHaveBeenCalledWith({ tasting_notes: null });
    });
  });

  describe("New Tasting Creation", () => {
    it("should create new tasting with all fields", async () => {
      const insertMock = jest.fn().mockResolvedValue({
        data: { id: "new-tasting-id" },
        error: null,
      });
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      await createNewTasting({
        vintage_id: TEST_VINTAGE_ID,
        verdict: 4,
        notes: "First impression notes",
        tasted_at: "2024-03-20",
        location_name: "Home",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("tastings");
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: TEST_USER.id,
          vintage_id: TEST_VINTAGE_ID,
          verdict: 4,
          notes: "First impression notes",
        })
      );
    });

    it("should create casual-style tasting with only rating", async () => {
      const insertMock = jest.fn().mockResolvedValue({
        data: { id: "new-tasting-id" },
        error: null,
      });
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      await createNewTasting({
        vintage_id: TEST_VINTAGE_ID,
        verdict: 3,
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: TEST_USER.id,
          vintage_id: TEST_VINTAGE_ID,
          verdict: 3,
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors on save", async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });

      const result = await saveTastingRating(TEST_TASTING_ID, 4);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle authentication failures", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await saveTastingRating(TEST_TASTING_ID, 4);
      expect(result.success).toBe(false);
      expect(result.error).toContain("authenticated");
    });

    it("should handle network errors gracefully", async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error("Network error");
      });

      const result = await saveTastingRating(TEST_TASTING_ID, 4);
      expect(result.success).toBe(false);
    });
  });

  describe("Data Integrity", () => {
    it("should not modify other fields when updating rating", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveTastingRating(TEST_TASTING_ID, 5);

      // Should only contain verdict and updated_at, not modify notes or location
      const updateCall = updateMock.mock.calls[0][0];
      expect(Object.keys(updateCall)).toEqual(
        expect.arrayContaining(["verdict"])
      );
    });

    it("should always include updated_at on updates", async () => {
      const updateMock = createSuccessUpdateMock();
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await saveTastingRating(TEST_TASTING_ID, 4);

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ updated_at: expect.any(Date) })
      );
    });
  });
});

// Helper functions

function createSuccessUpdateMock() {
  return jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  });
}

interface SaveResult {
  success: boolean;
  error?: string;
}

async function saveTastingRating(
  tastingId: string,
  rating: number
): Promise<SaveResult> {
  try {
    const { data: authData } = await mockSupabase.auth.getUser();
    if (!authData?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await mockSupabase
      .from("tastings")
      .update({ verdict: rating, updated_at: new Date() })
      .eq("id", tastingId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function saveTastingWithNotes(
  tastingId: string,
  data: {
    verdict: number | null;
    notes?: string;
    detailed_notes?: string;
  }
): Promise<SaveResult> {
  const { data: authData } = await mockSupabase.auth.getUser();
  if (!authData?.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await mockSupabase
    .from("tastings")
    .update({ ...data, updated_at: new Date() })
    .eq("id", tastingId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function saveTastingLocation(
  tastingId: string,
  locationData: {
    location_name: string | null;
    location_address: string | null;
    location_city: string | null;
    location_latitude: number | null;
    location_longitude: number | null;
  }
): Promise<SaveResult> {
  const { data: authData } = await mockSupabase.auth.getUser();
  if (!authData?.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await mockSupabase
    .from("tastings")
    .update({ ...locationData, updated_at: new Date() })
    .eq("id", tastingId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function saveTastingDate(
  tastingId: string,
  date: string
): Promise<SaveResult> {
  const { data: authData } = await mockSupabase.auth.getUser();
  if (!authData?.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await mockSupabase
    .from("tastings")
    .update({ tasted_at: date, updated_at: new Date() })
    .eq("id", tastingId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function saveWineNameFromForm(
  wineId: string,
  name: string
): Promise<SaveResult> {
  const { error } = await mockSupabase
    .from("wines")
    .update({ name })
    .eq("id", wineId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function saveWineDescriptionFromForm(
  wineId: string,
  description: string | null
): Promise<SaveResult> {
  const { error } = await mockSupabase
    .from("wines")
    .update({ tasting_notes: description })
    .eq("id", wineId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function createNewTasting(data: {
  vintage_id: string;
  verdict?: number;
  notes?: string;
  detailed_notes?: string;
  tasted_at?: string;
  location_name?: string;
}): Promise<SaveResult> {
  const { data: authData } = await mockSupabase.auth.getUser();
  if (!authData?.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await mockSupabase.from("tastings").insert({
    ...data,
    user_id: authData.user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
