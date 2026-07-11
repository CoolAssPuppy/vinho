import {
  scanWineLabel,
  getUserScans,
  improveOcrResult,
  confirmWineMatch,
} from "@/lib/actions/scan";

// A chainable, awaitable stand-in for a PostgREST query builder. Every builder
// method returns the same object so any chain (insert().select().single(),
// select().eq().order(), update().eq().eq()) is valid, and awaiting the builder
// resolves to the configured `{ data, error }` result.
type QueryResult = { data?: unknown; error?: unknown };

function makeQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {
    insert: jest.fn(() => builder),
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    update: jest.fn(() => builder),
    single: jest.fn(() => builder),
    then: (resolve: (value: QueryResult) => unknown) => resolve(result),
  };
  return builder;
}

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  storage: {
    from: jest.fn(),
  },
  from: jest.fn(),
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
  },
};

jest.mock("@/lib/supabase-server", () => ({
  createServerSupabase: jest.fn(() => mockSupabase),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Scan Actions", () => {
  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.functions.invoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });
  });

  describe("scanWineLabel", () => {
    const base64Image =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4w";

    const mockScan = {
      id: "scan-id",
      user_id: mockUser.id,
      image_path: `${mockUser.id}/1234567890.jpg`,
      scan_image_url: "https://example.com/image.jpg",
    };

    const mockQueueItem = {
      id: "queue-id",
      user_id: mockUser.id,
      image_url: "https://example.com/image.jpg",
      scan_id: "scan-id",
      status: "pending",
    };

    const setupSuccessfulUpload = () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: mockScan.image_path },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://example.com/image.jpg" },
        }),
      });
    };

    it("should successfully scan and queue a wine label", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      setupSuccessfulUpload();
      mockSupabase.from.mockImplementation((table: string) =>
        makeQueryBuilder({
          data: table === "scans" ? mockScan : mockQueueItem,
          error: null,
        }),
      );

      const result = await scanWineLabel(base64Image);

      expect(result).toEqual({
        scanId: mockScan.id,
        queueItemId: mockQueueItem.id,
        message: "Wine label is being analyzed. Results will appear shortly.",
        wineData: null,
      });

      expect(mockSupabase.storage.from).toHaveBeenCalledWith("scans");
      expect(mockSupabase.from).toHaveBeenCalledWith("scans");
      expect(mockSupabase.from).toHaveBeenCalledWith("wines_added_queue");
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(scanWineLabel(base64Image)).rejects.toThrow(
        "Not authenticated",
      );
    });

    it("should throw error when storage upload fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Upload failed" },
        }),
        getPublicUrl: jest.fn(),
      });

      await expect(scanWineLabel(base64Image)).rejects.toThrow("Upload failed");
    });

    it("should throw when the scan record cannot be created", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      setupSuccessfulUpload();
      mockSupabase.from.mockImplementation(() =>
        makeQueryBuilder({
          data: null,
          error: { message: "insert rejected" },
        }),
      );

      await expect(scanWineLabel(base64Image)).rejects.toThrow(
        "insert rejected",
      );
    });
  });

  describe("getUserScans", () => {
    it("should successfully fetch user scans", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockScans = [
        {
          id: "scan-1",
          user_id: mockUser.id,
          image_path: "path1.jpg",
          matched_vintage: {
            year: 2020,
            wine: {
              name: "Test Wine",
              producer: { name: "Test Producer" },
            },
          },
        },
      ];

      mockSupabase.from.mockReturnValue(
        makeQueryBuilder({ data: mockScans, error: null }),
      );

      const result = await getUserScans();

      expect(result).toEqual(mockScans);
      expect(mockSupabase.from).toHaveBeenCalledWith("scans");
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(getUserScans()).rejects.toThrow("Not authenticated");
    });
  });

  describe("improveOcrResult", () => {
    it("should successfully update OCR text", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        makeQueryBuilder({ error: null }),
      );

      await expect(
        improveOcrResult("scan-id", "corrected text"),
      ).resolves.toBeUndefined();
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(improveOcrResult("scan-id", "text")).rejects.toThrow(
        "Not authenticated",
      );
    });
  });

  describe("confirmWineMatch", () => {
    it("should successfully confirm wine match", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        makeQueryBuilder({ error: null }),
      );

      await expect(
        confirmWineMatch("scan-id", "vintage-id"),
      ).resolves.toBeUndefined();
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(confirmWineMatch("scan-id", "vintage-id")).rejects.toThrow(
        "Not authenticated",
      );
    });
  });
});
