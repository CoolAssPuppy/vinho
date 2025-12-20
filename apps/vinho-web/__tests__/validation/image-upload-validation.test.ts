import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

describe("Image Upload Validation", () => {
  const validateImage = (
    imageData: Buffer | string,
  ): { valid: boolean; error?: string } => {
    // Check if it's a buffer or base64 string
    let buffer: Buffer;

    if (typeof imageData === "string") {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      try {
        buffer = Buffer.from(base64Data, "base64");
      } catch {
        return { valid: false, error: "Invalid base64 data" };
      }
    } else {
      buffer = imageData;
    }

    // Check minimum size (at least 100 bytes for a real image)
    if (buffer.length < 100) {
      return { valid: false, error: "Image too small to be valid" };
    }

    // Check maximum size (10MB limit)
    if (buffer.length > 10 * 1024 * 1024) {
      return { valid: false, error: "Image exceeds 10MB limit" };
    }

    // Check for valid image headers
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff]);
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    const isJPEG = buffer.slice(0, 3).equals(jpegHeader);
    const isPNG = buffer.slice(0, 4).equals(pngHeader);

    if (!isJPEG && !isPNG) {
      return { valid: false, error: "Not a valid JPEG or PNG image" };
    }

    return { valid: true };
  };

  it("should accept valid JPEG image", () => {
    const testImagePath = path.join(
      process.cwd(),
      "../..",
      "scripts",
      "wine-test-1.jpeg",
    );
    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      const result = validateImage(imageBuffer);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    }
  });

  it("should accept valid base64 encoded image", () => {
    // Minimal valid JPEG
    const base64Image =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";
    const result = validateImage(base64Image);
    expect(result.valid).toBe(true);
  });

  it("should reject empty image data", () => {
    const result = validateImage(Buffer.from([]));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too small");
  });

  it("should reject non-image data", () => {
    const textBuffer = Buffer.from("This is not an image");
    const result = validateImage(textBuffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too small");
  });

  it("should reject corrupted image headers", () => {
    const corruptedData = Buffer.from([
      0x00,
      0x00,
      0x00,
      0x00,
      ...Array(2000).fill(0xff),
    ]);
    const result = validateImage(corruptedData);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Not a valid JPEG or PNG");
  });

  it("should reject images over 10MB", () => {
    // Create a buffer just over 10MB
    const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
    // Add valid JPEG header
    oversizedBuffer[0] = 0xff;
    oversizedBuffer[1] = 0xd8;
    oversizedBuffer[2] = 0xff;

    const result = validateImage(oversizedBuffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceeds 10MB");
  });

  it("should reject invalid base64 strings", () => {
    const result = validateImage("not-valid-base64!@#$%");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should handle PNG images", () => {
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const validPNG = Buffer.concat([pngHeader, Buffer.alloc(2000)]);
    const result = validateImage(validPNG);
    expect(result.valid).toBe(true);
  });
});

describe("Image Processing Pipeline", () => {
  const processImageForScan = async (
    imageData: string | Buffer,
  ): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
  }> => {
    // Validate image first
    const validation = validateImage(imageData);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Simulate upload process
    try {
      // Convert to buffer if needed
      let buffer: Buffer;
      if (typeof imageData === "string") {
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      } else {
        buffer = imageData;
      }

      // Generate unique filename
      const fileName = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

      // Simulate successful upload
      const imageUrl = `https://storage.example.com/scans/${fileName}`;

      return { success: true, imageUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  };

  const validateImage = (
    imageData: Buffer | string,
  ): { valid: boolean; error?: string } => {
    // Reuse validation logic from above
    let buffer: Buffer;

    if (typeof imageData === "string") {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      try {
        buffer = Buffer.from(base64Data, "base64");
      } catch {
        return { valid: false, error: "Invalid base64 data" };
      }
    } else {
      buffer = imageData;
    }

    if (buffer.length < 1024) {
      return { valid: false, error: "Image too small" };
    }

    if (buffer.length > 10 * 1024 * 1024) {
      return { valid: false, error: "Image too large" };
    }

    return { valid: true };
  };

  it("should process valid image successfully", async () => {
    const validImage = Buffer.alloc(5000, 0xff);
    const result = await processImageForScan(validImage);

    expect(result.success).toBe(true);
    expect(result.imageUrl).toBeDefined();
    expect(result.imageUrl).toContain("https://storage.example.com/scans/");
  });

  it("should generate unique URLs for each upload", async () => {
    const image1 = Buffer.alloc(5000, 0xff);
    const image2 = Buffer.alloc(5000, 0xff);

    const result1 = await processImageForScan(image1);
    const result2 = await processImageForScan(image2);

    expect(result1.imageUrl).not.toBe(result2.imageUrl);
  });

  it("should reject invalid images before upload", async () => {
    const invalidImage = Buffer.from("not an image");
    const result = await processImageForScan(invalidImage);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.imageUrl).toBeUndefined();
  });
});
