import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import {
  scanWineLabel,
  getUserScans,
  improveOcrResult,
  confirmWineMatch,
} from "@/lib/actions/scan";

// Mock the Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(),
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
};

jest.mock("@/lib/supabase-server", () => ({
  createServerSupabase: jest.fn(() => mockSupabase),
}));

describe("Scan Actions", () => {
  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("scanWineLabel", () => {
    const base64Image =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4w";

    it("should successfully scan and queue a wine label", async () => {
      // Mock user authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock storage upload
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: `${mockUser.id}/1234567890.jpg` },
        error: null,
      });

      // Mock public URL generation
      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: "https://example.com/image.jpg" },
      });

      // Mock scan insertion
      const mockScan = {
        id: "scan-id",
        user_id: mockUser.id,
        image_path: `${mockUser.id}/1234567890.jpg`,
        scan_image_url: "https://example.com/image.jpg",
      };
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockScan,
        error: null,
      });

      // Mock queue insertion
      const mockQueueItem = {
        id: "queue-id",
        user_id: mockUser.id,
        image_url: "https://example.com/image.jpg",
        scan_id: "scan-id",
        status: "pending",
      };
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockQueueItem,
        error: null,
      });

      const result = await scanWineLabel(base64Image);

      expect(result).toEqual({
        scan: mockScan,
        queueItem: mockQueueItem,
        message:
          "Wine label added to processing queue. It will be analyzed shortly.",
        wine: null,
        vintage: null,
        confidence: 0,
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

      mockSupabase.storage.from().upload.mockResolvedValue({
        data: null,
        error: { message: "Upload failed" },
      });

      await expect(scanWineLabel(base64Image)).rejects.toEqual({
        message: "Upload failed",
      });
    });

    it("should handle malformed base64 image", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidBase64 = "invalid-base64";

      await expect(scanWineLabel(invalidBase64)).rejects.toThrow();
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

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockScans,
        error: null,
      });

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

      mockSupabase.from().update().eq().eq.mockResolvedValue({
        error: null,
      });

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

      mockSupabase.from().update().eq().eq.mockResolvedValue({
        error: null,
      });

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
