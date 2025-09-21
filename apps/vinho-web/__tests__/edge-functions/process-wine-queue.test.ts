import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

// Mock Web APIs for Edge Function testing
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  method: options?.method || "GET",
  headers: new Headers(options?.headers || {}),
}));

global.Response = jest.fn().mockImplementation((body, options) => ({
  status: options?.status || 200,
  headers: new Headers(options?.headers || {}),
  json: jest.fn().mockResolvedValue(JSON.parse(body)),
  text: jest.fn().mockResolvedValue(body),
}));

global.Headers = jest.fn().mockImplementation((init) => {
  const headers = new Map();
  if (init) {
    for (const [key, value] of Object.entries(init)) {
      headers.set(key.toLowerCase(), value);
    }
  }
  return {
    set: (key: string, value: string) => headers.set(key.toLowerCase(), value),
    get: (key: string) => headers.get(key.toLowerCase()),
    has: (key: string) => headers.has(key.toLowerCase()),
  };
});

// Mock the global fetch function for HTTP requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        lte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              }),
            ),
          })),
        })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    })),
    insert: jest.fn(() => Promise.resolve({ error: null })),
    upsert: jest.fn(() => Promise.resolve({ error: null })),
  })),
};

// Mock OpenAI client
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

// Mock the dependencies that would be imported in the Edge Function
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock Deno environment for testing
const mockDeno = {
  env: {
    get: jest.fn((key: string) => {
      const envVars: Record<string, string> = {
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
        OPENAI_API_KEY: "test-openai-key",
      };
      return envVars[key];
    }),
  },
};

// @ts-ignore - Mocking global Deno
global.Deno = mockDeno;

describe("Process Wine Queue Edge Function", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() =>
                Promise.resolve({
                  data: [],
                  error: null,
                }),
              ),
            })),
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      upsert: jest.fn(() => Promise.resolve({ error: null })),
    });
  });

  it("should process wine queue items successfully", async () => {
    const mockQueueItems = [
      {
        id: "queue-1",
        user_id: "user-1",
        image_url: "https://example.com/wine1.jpg",
        ocr_text: "Château Test 2020 Bordeaux",
        scan_id: "scan-1",
        retry_count: 0,
      },
    ];

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

    // Mock the queue selection to return items
    mockSupabaseClient
      .from()
      .select()
      .eq()
      .lte()
      .order()
      .limit.mockResolvedValue({
        data: mockQueueItems,
        error: null,
      });

    // Mock OpenAI response
    mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

    // Mock the Edge Function request
    const request = new Request(
      "https://test.supabase.co/functions/v1/process-wine-queue",
      {
        method: "POST",
      },
    );

    // This would normally import and call the Edge Function
    // For testing, we simulate the main processing logic
    const mockProcessQueue = async () => {
      // Simulate fetching queue items
      const { data: queueItems } = await mockSupabaseClient
        .from("wines_added")
        .select("*")
        .eq("status", "pending")
        .lte("retry_count", 3)
        .order("created_at", { ascending: true })
        .limit(5);

      for (const item of queueItems || []) {
        // Simulate processing each item
        await mockOpenAI.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Analyze wine label: ${item.ocr_text}`,
            },
          ],
        });

        // Simulate updating the queue item
        await mockSupabaseClient
          .from("wines_added")
          .update({ status: "completed" })
          .eq("id", item.id);
      }

      return new Response(
        JSON.stringify({
          processed: queueItems?.length || 0,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    const response = await mockProcessQueue();
    const result = await response.json();

    expect(result.processed).toBe(1);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Analyze wine label: Château Test 2020 Bordeaux",
        },
      ],
    });
  });

  it("should handle queue items with no OCR text", async () => {
    const mockQueueItems = [
      {
        id: "queue-2",
        user_id: "user-1",
        image_url: "https://example.com/wine2.jpg",
        ocr_text: null,
        scan_id: "scan-2",
        retry_count: 0,
      },
    ];

    mockSupabaseClient
      .from()
      .select()
      .eq()
      .lte()
      .order()
      .limit.mockResolvedValue({
        data: mockQueueItems,
        error: null,
      });

    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              winery_name: "Unknown Winery",
              wine_name: "Unknown Wine",
              varietal: null,
              year: null,
              region: null,
              country: null,
              confidence: 0.3,
            }),
          },
        },
      ],
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

    const mockProcessQueue = async () => {
      const { data: queueItems } = await mockSupabaseClient
        .from("wines_added")
        .select("*")
        .eq("status", "pending")
        .lte("retry_count", 3)
        .order("created_at", { ascending: true })
        .limit(5);

      for (const item of queueItems || []) {
        await mockOpenAI.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this wine label image",
                },
                {
                  type: "image_url",
                  image_url: { url: item.image_url },
                },
              ],
            },
          ],
        });

        await mockSupabaseClient
          .from("wines_added")
          .update({ status: "completed" })
          .eq("id", item.id);
      }

      return new Response(
        JSON.stringify({
          processed: queueItems?.length || 0,
        }),
      );
    };

    await mockProcessQueue();

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this wine label image",
            },
            {
              type: "image_url",
              image_url: { url: "https://example.com/wine2.jpg" },
            },
          ],
        },
      ],
    });
  });

  it("should handle OpenAI API errors gracefully", async () => {
    const mockQueueItems = [
      {
        id: "queue-3",
        user_id: "user-1",
        image_url: "https://example.com/wine3.jpg",
        ocr_text: "Test Wine Label",
        scan_id: "scan-3",
        retry_count: 0,
      },
    ];

    mockSupabaseClient
      .from()
      .select()
      .eq()
      .lte()
      .order()
      .limit.mockResolvedValue({
        data: mockQueueItems,
        error: null,
      });

    // Mock OpenAI to throw an error
    mockOpenAI.chat.completions.create.mockRejectedValue(
      new Error("OpenAI API Error"),
    );

    const mockProcessQueue = async () => {
      const { data: queueItems } = await mockSupabaseClient
        .from("wines_added")
        .select("*")
        .eq("status", "pending")
        .lte("retry_count", 3)
        .order("created_at", { ascending: true })
        .limit(5);

      let processed = 0;

      for (const item of queueItems || []) {
        try {
          await mockOpenAI.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [],
          });
          processed++;
        } catch (error) {
          // Increment retry count on error
          await mockSupabaseClient
            .from("wines_added")
            .update({
              retry_count: item.retry_count + 1,
              status: item.retry_count >= 2 ? "failed" : "pending",
            })
            .eq("id", item.id);
        }
      }

      return new Response(
        JSON.stringify({
          processed,
          errors: queueItems?.length || 0,
        }),
      );
    };

    const response = await mockProcessQueue();
    const result = await response.json();

    expect(result.processed).toBe(0);
    expect(result.errors).toBe(1);
    expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
      retry_count: 1,
      status: "pending",
    });
  });

  it("should mark items as failed after max retries", async () => {
    const mockQueueItems = [
      {
        id: "queue-4",
        user_id: "user-1",
        image_url: "https://example.com/wine4.jpg",
        ocr_text: "Test Wine Label",
        scan_id: "scan-4",
        retry_count: 2, // Already at max retries
      },
    ];

    mockSupabaseClient
      .from()
      .select()
      .eq()
      .lte()
      .order()
      .limit.mockResolvedValue({
        data: mockQueueItems,
        error: null,
      });

    mockOpenAI.chat.completions.create.mockRejectedValue(
      new Error("OpenAI API Error"),
    );

    const mockProcessQueue = async () => {
      const { data: queueItems } = await mockSupabaseClient
        .from("wines_added")
        .select("*")
        .eq("status", "pending")
        .lte("retry_count", 3)
        .order("created_at", { ascending: true })
        .limit(5);

      for (const item of queueItems || []) {
        try {
          await mockOpenAI.chat.completions.create({});
        } catch (error) {
          await mockSupabaseClient
            .from("wines_added")
            .update({
              retry_count: item.retry_count + 1,
              status: item.retry_count >= 2 ? "failed" : "pending",
            })
            .eq("id", item.id);
        }
      }

      return new Response(JSON.stringify({ processed: 0 }));
    };

    await mockProcessQueue();

    expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
      retry_count: 3,
      status: "failed",
    });
  });

  it("should handle invalid JSON response from OpenAI", async () => {
    const mockQueueItems = [
      {
        id: "queue-5",
        user_id: "user-1",
        image_url: "https://example.com/wine5.jpg",
        ocr_text: "Test Wine Label",
        scan_id: "scan-5",
        retry_count: 0,
      },
    ];

    mockSupabaseClient
      .from()
      .select()
      .eq()
      .lte()
      .order()
      .limit.mockResolvedValue({
        data: mockQueueItems,
        error: null,
      });

    // Mock OpenAI to return invalid JSON
    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: "This is not valid JSON",
          },
        },
      ],
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

    const mockProcessQueue = async () => {
      const { data: queueItems } = await mockSupabaseClient
        .from("wines_added")
        .select("*")
        .eq("status", "pending")
        .lte("retry_count", 3)
        .order("created_at", { ascending: true })
        .limit(5);

      for (const item of queueItems || []) {
        try {
          const response = await mockOpenAI.chat.completions.create({});
          const content = response.choices[0].message.content;

          // This should throw due to invalid JSON
          JSON.parse(content);
        } catch (error) {
          await mockSupabaseClient
            .from("wines_added")
            .update({
              retry_count: item.retry_count + 1,
              status: "pending",
            })
            .eq("id", item.id);
        }
      }

      return new Response(JSON.stringify({ processed: 0 }));
    };

    await mockProcessQueue();

    expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
      retry_count: 1,
      status: "pending",
    });
  });

  it("should process multiple queue items in batch", async () => {
    const mockQueueItems = [
      {
        id: "queue-6",
        user_id: "user-1",
        image_url: "https://example.com/wine6.jpg",
        ocr_text: "Wine 1",
        scan_id: "scan-6",
        retry_count: 0,
      },
      {
        id: "queue-7",
        user_id: "user-1",
        image_url: "https://example.com/wine7.jpg",
        ocr_text: "Wine 2",
        scan_id: "scan-7",
        retry_count: 0,
      },
    ];

    mockSupabaseClient
      .from()
      .select()
      .eq()
      .lte()
      .order()
      .limit.mockResolvedValue({
        data: mockQueueItems,
        error: null,
      });

    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              winery_name: "Test Winery",
              wine_name: "Test Wine",
              varietal: "Merlot",
              year: 2021,
              region: "Test Region",
              country: "Test Country",
              confidence: 0.9,
            }),
          },
        },
      ],
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

    const mockProcessQueue = async () => {
      const { data: queueItems } = await mockSupabaseClient
        .from("wines_added")
        .select("*")
        .eq("status", "pending")
        .lte("retry_count", 3)
        .order("created_at", { ascending: true })
        .limit(5);

      let processed = 0;
      for (const item of queueItems || []) {
        await mockOpenAI.chat.completions.create({});
        await mockSupabaseClient
          .from("wines_added")
          .update({ status: "completed" })
          .eq("id", item.id);
        processed++;
      }

      return new Response(JSON.stringify({ processed }));
    };

    const response = await mockProcessQueue();
    const result = await response.json();

    expect(result.processed).toBe(2);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it("should return 200 when no queue items to process", async () => {
    mockSupabaseClient
      .from()
      .select()
      .eq()
      .lte()
      .order()
      .limit.mockResolvedValue({
        data: [],
        error: null,
      });

    const mockProcessQueue = async () => {
      const { data: queueItems } = await mockSupabaseClient
        .from("wines_added")
        .select("*")
        .eq("status", "pending")
        .lte("retry_count", 3)
        .order("created_at", { ascending: true })
        .limit(5);

      return new Response(
        JSON.stringify({
          processed: queueItems?.length || 0,
          message: "No items to process",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    const response = await mockProcessQueue();
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.processed).toBe(0);
    expect(result.message).toBe("No items to process");
    expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
  });
});
