import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { WineQuiz } from "@/components/wine-quiz";

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
};

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => mockSupabase),
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("WineQuiz Component", () => {
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();
  const userId = "test-user-id";

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variables for test
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("renders first question correctly", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText("Wine Preference Quiz")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 7")).toBeInTheDocument();
    expect(
      screen.getByText("How would you describe your wine experience?"),
    ).toBeInTheDocument();

    // Check radio options
    expect(
      screen.getByText("Just starting my wine journey"),
    ).toBeInTheDocument();
    expect(screen.getByText("I enjoy wine occasionally")).toBeInTheDocument();
    expect(
      screen.getByText("I actively explore different wines"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("I have extensive wine knowledge"),
    ).toBeInTheDocument();
  });

  it("shows progress indicator", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const progressBar = screen.getByRole("progressbar", { hidden: true });
    expect(progressBar).toBeInTheDocument();
    // First question should show ~14% progress (1/7)
    expect(progressBar).toHaveStyle("width: 14.285714285714286%");
  });

  it("disables Next button when no answer is selected", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const nextButton = screen.getByText("Next");
    expect(nextButton).toBeDisabled();
  });

  it("enables Next button when answer is selected", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const radioOption = screen.getByLabelText("Just starting my wine journey");
    fireEvent.click(radioOption);

    const nextButton = screen.getByText("Next");
    expect(nextButton).not.toBeDisabled();
  });

  it("navigates to next question when Next is clicked", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    // Answer first question
    const radioOption = screen.getByLabelText("Just starting my wine journey");
    fireEvent.click(radioOption);

    // Click Next
    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    // Check we're on question 2
    expect(screen.getByText("Question 2 of 7")).toBeInTheDocument();
    expect(
      screen.getByText("Which wine style do you generally prefer?"),
    ).toBeInTheDocument();
  });

  it("disables Previous button on first question", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    const previousButton = screen.getByText("Previous");
    expect(previousButton).toBeDisabled();
  });

  it("enables Previous button after first question", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    // Go to second question
    const radioOption = screen.getByLabelText("Just starting my wine journey");
    fireEvent.click(radioOption);
    fireEvent.click(screen.getByText("Next"));

    const previousButton = screen.getByText("Previous");
    expect(previousButton).not.toBeDisabled();
  });

  it("navigates back to previous question", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    // Go to second question
    const radioOption = screen.getByLabelText("Just starting my wine journey");
    fireEvent.click(radioOption);
    fireEvent.click(screen.getByText("Next"));

    // Go back
    fireEvent.click(screen.getByText("Previous"));

    expect(screen.getByText("Question 1 of 7")).toBeInTheDocument();
    expect(
      screen.getByText("How would you describe your wine experience?"),
    ).toBeInTheDocument();
  });

  it("shows Complete Quiz button on last question", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    // Navigate to last question (question 7)
    const questions = [
      "Just starting my wine journey",
      "Bold reds with rich flavors",
      "Light and delicate",
      "Fresh fruits and berries",
      "With meals and food pairings",
      "I stick to what I know I like",
      "Under $20 - Great value wines",
    ];

    questions.forEach((answer, index) => {
      const radioOption = screen.getByLabelText(answer);
      fireEvent.click(radioOption);

      if (index < questions.length - 1) {
        fireEvent.click(screen.getByText("Next"));
      }
    });

    expect(screen.getByText("Question 7 of 7")).toBeInTheDocument();
    expect(screen.getByText("Complete Quiz")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("saves quiz results when completed", async () => {
    const { toast } = require("sonner");

    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    // Complete all questions
    const questions = [
      "Just starting my wine journey",
      "Bold reds with rich flavors",
      "Light and delicate",
      "Fresh fruits and berries",
      "With meals and food pairings",
      "I stick to what I know I like",
      "Under $20 - Great value wines",
    ];

    questions.forEach((answer, index) => {
      const radioOption = screen.getByLabelText(answer);
      fireEvent.click(radioOption);

      if (index < questions.length - 1) {
        fireEvent.click(screen.getByText("Next"));
      }
    });

    // Complete quiz
    fireEvent.click(screen.getByText("Complete Quiz"));

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(toast.success).toHaveBeenCalledWith(
        "Wine profile saved successfully!",
      );
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it("handles quiz save error", async () => {
    const { toast } = require("sonner");

    // Mock error response
    mockSupabase
      .from()
      .update()
      .eq.mockResolvedValue({
        error: { message: "Database error" },
      });

    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    // Complete quiz quickly
    const radioOption = screen.getByLabelText("Just starting my wine journey");
    fireEvent.click(radioOption);

    // Navigate to last question and complete
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText("Next"));
      const options = screen.getAllByRole("radio");
      fireEvent.click(options[0]);
    }

    fireEvent.click(screen.getByText("Complete Quiz"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save preferences");
    });
  });

  it("calls onCancel when Cancel button is clicked", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("maintains selected answers when navigating between questions", () => {
    render(
      <WineQuiz
        userId={userId}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />,
    );

    // Select answer on first question
    const firstAnswer = screen.getByLabelText("Just starting my wine journey");
    fireEvent.click(firstAnswer);

    // Go to second question
    fireEvent.click(screen.getByText("Next"));

    // Go back to first question
    fireEvent.click(screen.getByText("Previous"));

    // Check answer is still selected
    expect(
      screen.getByLabelText("Just starting my wine journey"),
    ).toBeChecked();
  });
});
