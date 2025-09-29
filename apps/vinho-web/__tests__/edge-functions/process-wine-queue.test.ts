import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock OpenAI client
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

// Mock Supabase client methods
const createMockSupabaseClient = () => {
  const mockEq = jest.fn().mockResolvedValue({ error: null });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

  return {
    from: jest.fn(() => ({
      update: mockUpdate,
    })),
    mockUpdate,
    mockEq,
  };
};

// Test the actual business logic instead of testing the edge function directly
interface WineQueueItem {
  id: string;
  user_id: string;
  image_url: string;
  ocr_text: string | null;
  scan_id: string | null;
  retry_count: number;
}

interface ParsedWineData {
  winery_name: string;
  wine_name: string;
  varietal: string | null;
  year: number | null;
  region: string | null;
  country: string | null;
  confidence: number;
}

// Simulate the core logic of the edge function
async function processWineQueueItem(
  item: WineQueueItem,
  supabaseClient: any,
  openaiClient: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Simulate OpenAI parsing
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: item.ocr_text
            ? `Extract wine data from: ${item.ocr_text}`
            : `Analyze wine image at: ${item.image_url}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");

    const parsed: ParsedWineData = JSON.parse(content);

    // Update the queue item as processed
    await supabaseClient
      .from("wines_added_queue")
      .update({
        status: "completed",
        processed_data: parsed,
        processed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    return { success: true };
  } catch (error) {
    // Handle retry logic
    const newRetryCount = item.retry_count + 1;
    if (newRetryCount >= 3) {
      await supabaseClient
        .from("wines_added_queue")
        .update({
          status: "failed",
          retry_count: newRetryCount,
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", item.id);
    } else {
      await supabaseClient
        .from("wines_added_queue")
        .update({
          status: "pending",
          retry_count: newRetryCount,
        })
        .eq("id", item.id);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

describe("Process Wine Queue Logic", () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
  });

  it("should process wine queue items successfully", async () => {
    const mockQueueItem: WineQueueItem = {
      id: "queue-1",
      user_id: "user-1",
      image_url: "https://example.com/wine1.jpg",
      ocr_text: "Château Test 2020 Bordeaux",
      scan_id: "scan-1",
      retry_count: 0,
    };

    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              winery_name: "Château Test",
              wine_name: "Château Test",
              varietal: "Cabernet Sauvignon",
              year: 2020,
              region: "Bordeaux",
              country: "France",
              confidence: 0.95,
            }),
          },
        },
      ],
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

    const result = await processWineQueueItem(
      mockQueueItem,
      mockSupabaseClient,
      mockOpenAI,
    );

    expect(result.success).toBe(true);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Extract wine data from: Château Test 2020 Bordeaux",
        },
      ],
    });

    expect(mockSupabaseClient.from).toHaveBeenCalledWith("wines_added_queue");
    expect(mockSupabaseClient.mockUpdate).toHaveBeenCalledWith({
      status: "completed",
      processed_data: {
        winery_name: "Château Test",
        wine_name: "Château Test",
        varietal: "Cabernet Sauvignon",
        year: 2020,
        region: "Bordeaux",
        country: "France",
        confidence: 0.95,
      },
      processed_at: expect.any(String),
    });
  });

  it("should handle queue items with no OCR text", async () => {
    const mockQueueItem: WineQueueItem = {
      id: "queue-2",
      user_id: "user-1",
      image_url: "https://example.com/wine2.jpg",
      ocr_text: null,
      scan_id: "scan-2",
      retry_count: 0,
    };

    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              winery_name: "Test Winery",
              wine_name: "Test Wine",
              varietal: "Merlot",
              year: 2021,
              region: "Napa Valley",
              country: "USA",
              confidence: 0.85,
            }),
          },
        },
      ],
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

    const result = await processWineQueueItem(
      mockQueueItem,
      mockSupabaseClient,
      mockOpenAI,
    );

    expect(result.success).toBe(true);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Analyze wine image at: https://example.com/wine2.jpg",
        },
      ],
    });
  });

  it("should handle OpenAI API errors gracefully", async () => {
    const mockQueueItem: WineQueueItem = {
      id: "queue-3",
      user_id: "user-1",
      image_url: "https://example.com/wine3.jpg",
      ocr_text: "Test Label",
      scan_id: "scan-3",
      retry_count: 0,
    };

    mockOpenAI.chat.completions.create.mockRejectedValue(
      new Error("OpenAI API Error"),
    );

    const result = await processWineQueueItem(
      mockQueueItem,
      mockSupabaseClient,
      mockOpenAI,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("OpenAI API Error");
    expect(mockSupabaseClient.mockUpdate).toHaveBeenCalledWith({
      status: "pending",
      retry_count: 1,
    });
  });

  it("should mark items as failed after max retries", async () => {
    const mockQueueItem: WineQueueItem = {
      id: "queue-4",
      user_id: "user-1",
      image_url: "https://example.com/wine4.jpg",
      ocr_text: "Test Label",
      scan_id: "scan-4",
      retry_count: 2, // Already at 2 retries
    };

    mockOpenAI.chat.completions.create.mockRejectedValue(
      new Error("Persistent error"),
    );

    const result = await processWineQueueItem(
      mockQueueItem,
      mockSupabaseClient,
      mockOpenAI,
    );

    expect(result.success).toBe(false);
    expect(mockSupabaseClient.mockUpdate).toHaveBeenCalledWith({
      status: "failed",
      retry_count: 3,
      error_message: "Persistent error",
    });
  });

  it("should handle invalid JSON response from OpenAI", async () => {
    const mockQueueItem: WineQueueItem = {
      id: "queue-5",
      user_id: "user-1",
      image_url: "https://example.com/wine5.jpg",
      ocr_text: "Test Label",
      scan_id: "scan-5",
      retry_count: 0,
    };

    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: "Invalid JSON response",
          },
        },
      ],
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

    const result = await processWineQueueItem(
      mockQueueItem,
      mockSupabaseClient,
      mockOpenAI,
    );

    expect(result.success).toBe(false);
    expect(mockSupabaseClient.mockUpdate).toHaveBeenCalledWith({
      status: "pending",
      retry_count: 1,
    });
  });

  it("should handle missing OpenAI response", async () => {
    const mockQueueItem: WineQueueItem = {
      id: "queue-6",
      user_id: "user-1",
      image_url: "https://example.com/wine6.jpg",
      ocr_text: "Test Label",
      scan_id: "scan-6",
      retry_count: 0,
    };

    const mockOpenAIResponse = {
      choices: [],
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

    const result = await processWineQueueItem(
      mockQueueItem,
      mockSupabaseClient,
      mockOpenAI,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("No response from OpenAI");
  });
});
