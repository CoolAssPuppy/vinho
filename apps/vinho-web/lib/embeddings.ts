import OpenAI from "openai";

/**
 * Lazily initialize OpenAI client to avoid build-time errors
 * when environment variables are not available
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

/**
 * Generate embedding for tasting search text
 * Uses OpenAI's text-embedding-3-small model for cost efficiency
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536, // Match our vector column size
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Generate search text for a tasting including all related data
 */
export function generateTastingSearchText(data: {
  notes?: string;
  location?: string;
  wineName?: string;
  producerName?: string;
  regionName?: string;
  country?: string;
  vintage?: number | null;
  rating?: number;
  wineType?: string;
}): string {
  const parts = [];

  // Add basic fields
  if (data.notes) parts.push(data.notes);
  if (data.location) parts.push(data.location);
  if (data.wineName) parts.push(data.wineName);
  if (data.producerName) parts.push(data.producerName);
  if (data.regionName) parts.push(data.regionName);
  if (data.country) parts.push(data.country);
  if (data.vintage) parts.push(`${data.vintage} vintage`);
  if (data.wineType) parts.push(data.wineType);

  // Add rating descriptors
  if (data.rating) {
    switch (data.rating) {
      case 5:
        parts.push("excellent amazing outstanding five stars favorite");
        break;
      case 4:
        parts.push("very good great four stars");
        break;
      case 3:
        parts.push("good decent three stars");
        break;
      case 2:
        parts.push("okay average two stars");
        break;
      case 1:
        parts.push("poor bad one star");
        break;
    }
  }

  return parts.join(" ");
}

/**
 * Calculate cost for generating embeddings
 * text-embedding-3-small costs $0.02 per 1M tokens
 * Estimated 100 tokens per tasting
 */
export function calculateEmbeddingCost(tastingCount: number): number {
  const tokensPerTasting = 100;
  const totalTokens = tastingCount * tokensPerTasting;
  const costPerMillionTokens = 0.02;
  return (totalTokens / 1_000_000) * costPerMillionTokens;
}
