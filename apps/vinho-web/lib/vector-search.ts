/**
 * Shared types and helpers for Supabase Vector Bucket access.
 *
 * The Vector Bucket API is not yet fully typed in the SDK, so these interfaces
 * describe the shape the similar-wine routes rely on. Kept in one place so the
 * two routes (by-wine and for-user) can't drift apart.
 */

export const VECTOR_BUCKET = "wine-labels";
export const VECTOR_INDEX = "visual-embeddings";

export interface VectorQueryResult {
  key: string;
  distance?: number;
  metadata?: Record<string, unknown>;
}

export interface VectorIndex {
  getVector: (key: string) => Promise<{
    data: { data?: { float32?: number[] } } | null;
    error: Error | null;
  }>;
  queryVectors: (params: {
    queryVector: { float32: number[] };
    topK: number;
    returnDistance: boolean;
    returnMetadata: boolean;
  }) => Promise<{
    data: { vectors?: VectorQueryResult[] } | null;
    error: Error | null;
  }>;
}

export interface VectorBucket {
  index: (name: string) => VectorIndex;
}

export interface StorageWithVectors {
  vectors: { from: (bucket: string) => VectorBucket };
}

export interface SimilarWine {
  wine_id: string;
  wine_name: string;
  producer_name: string;
  similarity: number;
  image_url?: string;
  region?: string;
  country?: string;
}

/**
 * Convert a vector distance (0 = identical) to a similarity score in [0, 1].
 */
export function distanceToSimilarity(distance: number | undefined): number {
  return 1 - (distance ?? 0);
}
