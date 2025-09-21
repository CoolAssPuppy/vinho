import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { WinePreferences } from "@/components/wine-preferences";
import type { Database } from "@/types/database";

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

// Mock wine data
jest.mock("@/lib/wine-data", () => ({
  wineRegions: [
    "Bordeaux",
    "Napa Valley",
    "Tuscany",
    "Rioja",
    "Barossa Valley",
  ],
  grapeVarietals: [
    "Cabernet Sauvignon",
    "Merlot",
    "Pinot Noir",
    "Chardonnay",
    "Sauvignon Blanc",
  ],
  wineStyles: [
    "Full-bodied Red",
    "Light Red",
    "Crisp White",
    "Rich White",
    "Sparkling",
  ],
}));

describe("WinePreferences Component", () => {
  const mockProfile: Database["public"]["Tables"]["profiles"]["Row"] = {
    id: "test-user-id",
    email: "test@example.com",
    full_name: "Test User",
    avatar_url: null,
    wine_experience: "intermediate",
    favorite_regions: ["Bordeaux", "Tuscany"],
    favorite_varietals: ["Cabernet Sauvignon", "Merlot"],
    favorite_styles: ["Full-bodied Red"],
    wine_budget: "$20-40",
    wine_occasion: "dinner",
    adventure_level: "moderate",
    has_taken_quiz: true,
    created_at: "2023-01-01T00:00:00.000Z",
    updated_at: "2023-01-01T00:00:00.000Z",
  };

  const userId = "test-user-id";

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variables for test
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("renders all preference sections", () => {
    render(<WinePreferences profile={mockProfile} userId={userId} />);

    expect(screen.getByText("Favorite Wine Regions")).toBeInTheDocument();
    expect(
      screen.getByText("Add regions you love or want to explore"),
    ).toBeInTheDocument();

    expect(screen.getByText("Favorite Grape Varietals")).toBeInTheDocument();
    expect(
      screen.getByText("Select grapes that match your palate"),
    ).toBeInTheDocument();

    expect(screen.getByText("Preferred Wine Styles")).toBeInTheDocument();
    expect(
      screen.getByText("Choose styles that suit your taste"),
    ).toBeInTheDocument();

    expect(screen.getByText("Save Wine Preferences")).toBeInTheDocument();
  });

  it("displays existing preferences from profile", () => {
    render(<WinePreferences profile={mockProfile} userId={userId} />);

    // Check existing regions
    expect(screen.getByText("Bordeaux")).toBeInTheDocument();
    expect(screen.getByText("Tuscany")).toBeInTheDocument();

    // Check existing varietals
    expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument();
    expect(screen.getByText("Merlot")).toBeInTheDocument();

    // Check existing styles
    expect(screen.getByText("Full-bodied Red")).toBeInTheDocument();
  });

  it("shows search dropdowns when input is focused", () => {
    render(<WinePreferences profile={null} userId={userId} />);

    // Focus on region search
    const regionInput = screen.getByPlaceholderText("Search wine regions...");
    fireEvent.focus(regionInput);

    expect(screen.getByText("Napa Valley")).toBeInTheDocument();
    expect(screen.getByText("Rioja")).toBeInTheDocument();
  });

  it("filters search results based on input", () => {
    render(<WinePreferences profile={null} userId={userId} />);

    const regionInput = screen.getByPlaceholderText("Search wine regions...");
    fireEvent.focus(regionInput);
    fireEvent.change(regionInput, { target: { value: "napa" } });

    expect(screen.getByText("Napa Valley")).toBeInTheDocument();
    expect(screen.queryByText("Bordeaux")).not.toBeInTheDocument();
  });

  it("adds new region when selected from dropdown", () => {
    render(<WinePreferences profile={null} userId={userId} />);

    const regionInput = screen.getByPlaceholderText("Search wine regions...");
    fireEvent.focus(regionInput);

    const napaOption = screen.getByText("Napa Valley");
    fireEvent.click(napaOption);

    expect(screen.getByText("Napa Valley")).toBeInTheDocument();
    expect(regionInput).toHaveValue("");
  });

  it("removes region when X button is clicked", () => {
    render(<WinePreferences profile={mockProfile} userId={userId} />);

    const bordeauxBadge = screen.getByText("Bordeaux").closest(".pl-3");
    const removeButton = bordeauxBadge?.querySelector("button");

    if (removeButton) {
      fireEvent.click(removeButton);
    }

    expect(screen.queryByText("Bordeaux")).not.toBeInTheDocument();
  });

  it("excludes already selected regions from dropdown", () => {
    render(<WinePreferences profile={mockProfile} userId={userId} />);

    const regionInput = screen.getByPlaceholderText("Search wine regions...");
    fireEvent.focus(regionInput);

    expect(screen.queryByText("Bordeaux")).not.toBeInTheDocument(); // Already selected
    expect(screen.getByText("Napa Valley")).toBeInTheDocument(); // Not selected
  });

  it("handles varietals search and selection", () => {
    render(<WinePreferences profile={null} userId={userId} />);

    const varietalInput = screen.getByPlaceholderText(
      "Search grape varietals...",
    );
    fireEvent.focus(varietalInput);

    expect(screen.getByText("Pinot Noir")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Pinot Noir"));
    expect(screen.getByText("Pinot Noir")).toBeInTheDocument();
  });

  it("handles styles search and selection", () => {
    render(<WinePreferences profile={null} userId={userId} />);

    const styleInput = screen.getByPlaceholderText("Search wine styles...");
    fireEvent.focus(styleInput);

    expect(screen.getByText("Crisp White")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Crisp White"));
    expect(screen.getByText("Crisp White")).toBeInTheDocument();
  });

  it("closes dropdown when clicking outside", () => {
    render(<WinePreferences profile={null} userId={userId} />);

    const regionInput = screen.getByPlaceholderText("Search wine regions...");
    fireEvent.focus(regionInput);

    expect(screen.getByText("Napa Valley")).toBeInTheDocument();

    // Click outside the dropdown
    fireEvent.mouseDown(document.body);

    expect(screen.queryByText("Napa Valley")).not.toBeInTheDocument();
  });

  it("saves preferences successfully", async () => {
    const { toast } = require("sonner");

    render(<WinePreferences profile={mockProfile} userId={userId} />);

    const saveButton = screen.getByText("Save Wine Preferences");
    fireEvent.click(saveButton);

    expect(saveButton).toHaveTextContent("Saving...");

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(toast.success).toHaveBeenCalledWith("Wine preferences saved!");
      expect(saveButton).toHaveTextContent("Save Wine Preferences");
    });
  });

  it("handles save error", async () => {
    const { toast } = require("sonner");

    // Mock error response
    mockSupabase
      .from()
      .update()
      .eq.mockResolvedValue({
        error: { message: "Database error" },
      });

    render(<WinePreferences profile={mockProfile} userId={userId} />);

    const saveButton = screen.getByText("Save Wine Preferences");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save preferences");
    });
  });

  it("limits dropdown results to 10 items", () => {
    // Mock more wine data
    const manyRegions = Array.from({ length: 15 }, (_, i) => `Region ${i + 1}`);

    jest.doMock("@/lib/wine-data", () => ({
      wineRegions: manyRegions,
      grapeVarietals: ["Cabernet Sauvignon"],
      wineStyles: ["Full-bodied Red"],
    }));

    render(<WinePreferences profile={null} userId={userId} />);

    const regionInput = screen.getByPlaceholderText("Search wine regions...");
    fireEvent.focus(regionInput);

    // Should only show first 10 results
    expect(screen.getByText("Region 1")).toBeInTheDocument();
    expect(screen.getByText("Region 10")).toBeInTheDocument();
    expect(screen.queryByText("Region 11")).not.toBeInTheDocument();
  });

  it("handles empty profile gracefully", () => {
    render(<WinePreferences profile={null} userId={userId} />);

    // Should render without errors
    expect(screen.getByText("Favorite Wine Regions")).toBeInTheDocument();
    expect(screen.getByText("Save Wine Preferences")).toBeInTheDocument();

    // No badges should be displayed
    expect(screen.queryByText("Bordeaux")).not.toBeInTheDocument();
  });

  it("updates preferences when profile changes", () => {
    const { rerender } = render(
      <WinePreferences profile={null} userId={userId} />,
    );

    expect(screen.queryByText("Bordeaux")).not.toBeInTheDocument();

    rerender(<WinePreferences profile={mockProfile} userId={userId} />);

    expect(screen.getByText("Bordeaux")).toBeInTheDocument();
    expect(screen.getByText("Tuscany")).toBeInTheDocument();
  });

  it("disables save button while saving", async () => {
    render(<WinePreferences profile={mockProfile} userId={userId} />);

    const saveButton = screen.getByText("Save Wine Preferences");
    fireEvent.click(saveButton);

    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent("Saving...");

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
      expect(saveButton).toHaveTextContent("Save Wine Preferences");
    });
  });
});
