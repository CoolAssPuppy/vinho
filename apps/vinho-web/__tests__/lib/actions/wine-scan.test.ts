import { describe, expect, test, jest } from "@jest/globals";

// Mock the Supabase client
jest.mock("@/lib/supabase-server", () => ({
  createServerSupabase: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
        error: null,
      }),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://example.com/test-image.jpg" },
        }),
      })),
    },
    from: jest.fn((table) => ({
      insert: jest.fn().mockResolvedValue({
        data:
          table === "scans"
            ? {
                id: "scan-123",
                user_id: "test-user-id",
                image_path: "test.jpg",
              }
            : { id: "queue-123", user_id: "test-user-id", status: "pending" },
        error: null,
      }),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data:
          table === "scans"
            ? {
                id: "scan-123",
                user_id: "test-user-id",
                image_path: "test.jpg",
              }
            : { id: "queue-123", user_id: "test-user-id", status: "pending" },
        error: null,
      }),
    })),
    functions: {
      invoke: jest
        .fn()
        .mockResolvedValue({ data: { success: true }, error: null }),
    },
  })),
}));

// Import after mocking
import { scanWineLabel } from "@/lib/actions/scan";

describe("Wine Label Scanning", () => {
  describe("scanWineLabel", () => {
    const mockBase64Image = "data:image/jpeg;base64,/9j/4AAQSkZJRgAB...";

    test("should upload image and create scan record", async () => {
      const result = await scanWineLabel(mockBase64Image);

      expect(result).toBeDefined();
      expect(result.scanId).toBe("scan-123");
      expect(result.queueItemId).toBe("queue-123");
      expect(result.message).toContain("Wine label is being analyzed");
    });

    test("should handle missing user authentication", async () => {
      const { createServerSupabase } = require("@/lib/supabase-server");
      createServerSupabase.mockImplementationOnce(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }));

      await expect(scanWineLabel(mockBase64Image)).rejects.toThrow(
        "Not authenticated",
      );
    });

    test("should handle upload errors gracefully", async () => {
      const { createServerSupabase } = require("@/lib/supabase-server");
      createServerSupabase.mockImplementationOnce(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "test-user-id" } },
            error: null,
          }),
        },
        storage: {
          from: jest.fn(() => ({
            upload: jest.fn().mockResolvedValue({
              error: new Error("Storage quota exceeded"),
            }),
          })),
        },
      }));

      await expect(scanWineLabel(mockBase64Image)).rejects.toThrow(
        "Storage quota exceeded",
      );
    });

    test("should handle database insert errors", async () => {
      const { createServerSupabase } = require("@/lib/supabase-server");
      createServerSupabase.mockImplementationOnce(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "test-user-id" } },
            error: null,
          }),
        },
        storage: {
          from: jest.fn(() => ({
            upload: jest.fn().mockResolvedValue({ error: null }),
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: "https://example.com/test.jpg" },
            }),
          })),
        },
        from: jest.fn(() => ({
          insert: jest.fn().mockResolvedValue({
            data: null,
            error: new Error("Database connection failed"),
          }),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error("Database connection failed"),
          }),
        })),
      }));

      await expect(scanWineLabel(mockBase64Image)).rejects.toThrow(
        "Database connection failed",
      );
    });

    test("should continue even if edge function invocation fails", async () => {
      const { createServerSupabase } = require("@/lib/supabase-server");
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "test-user-id" } },
            error: null,
          }),
        },
        storage: {
          from: jest.fn(() => ({
            upload: jest.fn().mockResolvedValue({ error: null }),
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: "https://example.com/test.jpg" },
            }),
          })),
        },
        from: jest.fn((table) => ({
          insert: jest.fn().mockResolvedValue({
            data:
              table === "scans"
                ? { id: "scan-456", user_id: "test-user-id" }
                : { id: "queue-456", user_id: "test-user-id" },
            error: null,
          }),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data:
              table === "scans"
                ? { id: "scan-456", user_id: "test-user-id" }
                : { id: "queue-456", user_id: "test-user-id" },
            error: null,
          }),
        })),
        functions: {
          invoke: jest.fn().mockResolvedValue({
            data: null,
            error: new Error("Edge function timeout"),
          }),
        },
      };

      createServerSupabase.mockImplementationOnce(() => mockSupabase);

      // Should not throw even if edge function fails
      const result = await scanWineLabel(mockBase64Image);
      expect(result.scanId).toBe("scan-456");
      expect(result.queueItemId).toBe("queue-456");
    });
  });
});
