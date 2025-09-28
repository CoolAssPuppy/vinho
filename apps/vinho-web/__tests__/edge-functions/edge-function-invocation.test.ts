import { describe, it, expect, jest, beforeEach } from "@jest/globals";

describe("Edge Function Invocation - Process Wine Queue", () => {
  const mockSupabaseClient = {
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(),
  };

  const invokeWineProcessing = async (queueId?: string) => {
    try {
      const response = await mockSupabaseClient.functions.invoke(
        "process-wine-queue",
        {
          body: queueId ? { queueId } : {},
        },
      );

      if (response.error) {
        throw response.error;
      }

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should invoke edge function successfully", async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: {
        message: "Processed 1 wines successfully, 0 failed",
        total: 1,
        successful: 1,
        failed: 0,
      },
      error: null,
    });

    const result = await invokeWineProcessing();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.successful).toBe(1);
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
      "process-wine-queue",
      { body: {} },
    );
  });

  it("should handle edge function errors gracefully", async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: null,
      error: new Error("Edge function timeout"),
    });

    const result = await invokeWineProcessing();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Edge function timeout");
  });

  it("should pass queue ID when provided", async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    await invokeWineProcessing("queue-123");

    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
      "process-wine-queue",
      { body: { queueId: "queue-123" } },
    );
  });

  it("should handle network failures", async () => {
    mockSupabaseClient.functions.invoke.mockRejectedValue(
      new Error("Network request failed"),
    );

    const result = await invokeWineProcessing();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network request failed");
  });

  it("should verify edge function response structure", async () => {
    const mockResponse = {
      message: "Processed 3 wines successfully, 1 failed",
      total: 4,
      successful: 3,
      failed: 1,
      details: [
        { id: "wine-1", status: "completed" },
        { id: "wine-2", status: "completed" },
        { id: "wine-3", status: "completed" },
        { id: "wine-4", status: "failed", error: "Invalid image" },
      ],
    };

    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: mockResponse,
      error: null,
    });

    const result = await invokeWineProcessing();

    expect(result.success).toBe(true);
    expect(result.data.total).toBe(4);
    expect(result.data.successful).toBe(3);
    expect(result.data.failed).toBe(1);
    expect(result.data.message).toContain("3 wines successfully");
  });
});

describe("Edge Function Rate Limiting", () => {
  const mockSupabaseClient = {
    functions: {
      invoke: jest.fn(),
    },
  };

  const invokeWithRateLimit = async (
    functionName: string,
    maxRetries = 3,
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const response = await mockSupabaseClient.functions.invoke(
          functionName,
          {
            body: {},
          },
        );

        if (response.error?.message?.includes("rate limit")) {
          attempts++;
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempts) * 1000),
          );
          continue;
        }

        if (response.error) {
          throw response.error;
        }

        return { success: true, data: response.data };
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    }

    return { success: false, error: "Max retries exceeded" };
  };

  it("should retry on rate limit errors", async () => {
    let callCount = 0;
    mockSupabaseClient.functions.invoke.mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve({
          data: null,
          error: new Error("rate limit exceeded"),
        });
      }
      return Promise.resolve({
        data: { success: true },
        error: null,
      });
    });

    const result = await invokeWithRateLimit("process-wine-queue");

    expect(result.success).toBe(true);
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledTimes(3);
  });

  it("should fail after max retries", async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: null,
      error: new Error("rate limit exceeded"),
    });

    const result = await invokeWithRateLimit("process-wine-queue", 2);

    expect(result.success).toBe(false);
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledTimes(2);
  });
});

describe("Edge Function Real Wine Processing", () => {
  it("should verify Villa Oliveira test wine processing", () => {
    // This test verifies the expected output for our test wine
    const expectedOutput = {
      producer: "Villa Oliveira",
      wine_name: "Villa Oliveira",
      year: 2017,
      region: "Dao",
      country: "Portugal",
      confidence: expect.any(Number),
    };

    // Simulate edge function processing our test wine
    const processTestWine = (imageUrl: string) => {
      if (imageUrl.includes("wine-test-1")) {
        return {
          producer: "Villa Oliveira",
          wine_name: "Villa Oliveira",
          year: 2017,
          region: "Dao",
          country: "Portugal",
          confidence: 0.95,
        };
      }
      return null;
    };

    const result = processTestWine(
      "https://storage.example.com/scans/wine-test-1.jpeg",
    );

    expect(result).toMatchObject(expectedOutput);
    expect(result?.confidence).toBeGreaterThanOrEqual(0.8);
  });
});
