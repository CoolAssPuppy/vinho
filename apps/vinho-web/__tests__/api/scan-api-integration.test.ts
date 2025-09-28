import { describe, it, expect, beforeAll, jest } from "@jest/globals";
import { scanWineLabel } from "../../lib/actions/scan";
import fs from "fs";
import path from "path";

// Mock Supabase but verify the actual API calls are made
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  storage: {
    from: jest.fn(),
  },
  from: jest.fn(),
  functions: {
    invoke: jest.fn(),
  },
};

jest.mock("../../lib/supabase-server", () => ({
  createServerSupabase: jest.fn(() => mockSupabaseClient),
}));

describe("Wine Scan API Integration", () => {
  let testImageBase64: string;

  beforeAll(() => {
    // Load test image
    const testImagePath = path.join(
      process.cwd(),
      "../..",
      "scripts",
      "wine-test-1.jpeg",
    );
    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      testImageBase64 = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
    } else {
      testImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="; // Minimal valid JPEG
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    });

    const storageMock = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: "https://storage.example.com/scans/test.jpg" },
      }),
    };

    mockSupabaseClient.storage.from.mockReturnValue(storageMock);

    const dbMock = {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: "scan-123", image_path: "test.jpg" },
            error: null,
          }),
        }),
      }),
      select: jest.fn(),
      eq: jest.fn(),
    };

    mockSupabaseClient.from.mockReturnValue(dbMock);

    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });
  });

  it("should make all required API calls in correct sequence", async () => {
    const result = await scanWineLabel(testImageBase64);

    // Verify authentication check
    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(1);

    // Verify storage upload
    expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith("scans");
    const storageMock = mockSupabaseClient.storage.from("scans");
    expect(storageMock.upload).toHaveBeenCalledWith(
      expect.stringContaining("test-user-id"),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/jpeg" }),
    );

    // Verify scan record creation
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("scans");
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("wines_added");

    // Verify edge function invocation
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
      "process-wine-queue",
      expect.objectContaining({ body: {} }),
    );

    // Verify result structure
    expect(result).toHaveProperty("scanId");
    expect(result).toHaveProperty("queueItemId");
    expect(result).toHaveProperty("message");
  });

  it("should handle authentication errors properly", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(scanWineLabel(testImageBase64)).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("should handle storage upload failures", async () => {
    const storageMock = {
      upload: jest.fn().mockResolvedValue({
        error: new Error("Storage quota exceeded"),
      }),
      getPublicUrl: jest.fn(),
    };
    mockSupabaseClient.storage.from.mockReturnValue(storageMock);

    await expect(scanWineLabel(testImageBase64)).rejects.toThrow(
      "Storage quota exceeded",
    );
  });

  it("should continue even if edge function fails", async () => {
    mockSupabaseClient.functions.invoke.mockRejectedValue(
      new Error("Edge function timeout"),
    );

    // Should not throw - edge function errors are caught
    const result = await scanWineLabel(testImageBase64);
    expect(result).toHaveProperty("scanId");
    expect(result.message).toContain("being analyzed");
  });

  it("should properly format image data for upload", async () => {
    await scanWineLabel(testImageBase64);

    const storageMock = mockSupabaseClient.storage.from("scans");
    const uploadCall = storageMock.upload.mock.calls[0];

    // Verify file naming convention
    expect(uploadCall[0]).toMatch(/^test-user-id\/\d+\.jpg$/);

    // Verify buffer is created from base64
    expect(uploadCall[1]).toBeInstanceOf(Buffer);

    // Verify content type
    expect(uploadCall[2]).toEqual({
      contentType: "image/jpeg",
      upsert: false,
    });
  });

  it("should create proper queue entry", async () => {
    await scanWineLabel(testImageBase64);

    const dbCalls = mockSupabaseClient.from.mock.calls;
    const winesAddedCall = dbCalls.find((call) => call[0] === "wines_added");

    expect(winesAddedCall).toBeDefined();

    // Verify the insert was called with correct structure
    const insertMock = mockSupabaseClient.from("wines_added").insert;
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "test-user-id",
        image_url: expect.stringContaining("https://"),
        scan_id: expect.any(String),
        status: "pending",
      }),
    );
  });
});
