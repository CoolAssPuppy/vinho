// Image Storage Utilities for downloading and storing wine images

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

interface ImageDownloadResult {
  success: boolean;
  localUrl?: string;
  error?: string;
}

/**
 * Download an image from a URL and store it in Supabase Storage
 */
export async function downloadAndStoreImage(
  imageUrl: string,
  fileName: string,
  bucket: string = "wine-images",
): Promise<ImageDownloadResult> {
  try {
    // Validate input
    if (!imageUrl || !fileName) {
      return {
        success: false,
        error: "Invalid image URL or filename",
      };
    }

    // Download image from external URL
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VinhoApp/1.0)",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to download image: ${response.status} ${response.statusText}`,
      };
    }

    // Get image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Validate it's an image
    if (!contentType.startsWith("image/")) {
      return {
        success: false,
        error: "Downloaded content is not an image",
      };
    }

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageBuffer, {
        contentType,
        cacheControl: "3600",
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      // If file already exists, that's okay - just return the existing URL
      if (error.message.includes("already exists")) {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        return {
          success: true,
          localUrl: urlData.publicUrl,
        };
      }

      return {
        success: false,
        error: `Failed to upload to storage: ${error.message}`,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      localUrl: urlData.publicUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Generate a filename for storing wine images
 */
export function generateWineImageFileName(
  producerName: string,
  wineName: string,
  vintage?: number | null,
  originalUrl?: string,
): string {
  // Clean and normalize names
  const cleanProducer = producerName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase()
    .substring(0, 50);

  const cleanWine = wineName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase()
    .substring(0, 50);

  // Get file extension from original URL or default to jpg
  let extension = "jpg";
  if (originalUrl) {
    const urlParts = originalUrl.split(".");
    const lastPart = urlParts[urlParts.length - 1]?.toLowerCase();
    if (["jpg", "jpeg", "png", "webp"].includes(lastPart)) {
      extension = lastPart;
    }
  }

  // Build filename
  const vintageStr = vintage ? `_${vintage}` : "_nv";
  const timestamp = Date.now();

  return `${cleanProducer}/${cleanWine}${vintageStr}_${timestamp}.${extension}`;
}

/**
 * Download and store a Vivino wine image
 */
export async function downloadVivinoImage(
  imageUrl: string,
  producerName: string,
  wineName: string,
  vintage?: number | null,
): Promise<ImageDownloadResult> {
  if (!imageUrl || imageUrl.trim() === "") {
    return {
      success: false,
      error: "No image URL provided",
    };
  }

  // Generate filename
  const fileName = generateWineImageFileName(
    producerName,
    wineName,
    vintage,
    imageUrl,
  );

  // Download and store
  return downloadAndStoreImage(imageUrl, fileName);
}

/**
 * Create wine-images bucket if it doesn't exist
 */
export async function ensureWineImagesBucket(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(
      (bucket) => bucket.name === "wine-images",
    );

    if (!bucketExists) {
      // Create bucket
      const { error } = await supabase.storage.createBucket("wine-images", {
        public: true,
        allowedMimeTypes: [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ],
        fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
      });

      if (error) {
        console.error("Failed to create wine-images bucket:", error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error ensuring wine-images bucket:", error);
    return false;
  }
}
