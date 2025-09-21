import { render, screen, waitFor, act } from "@testing-library/react";
import { useUser, UserProvider } from "@/components/providers/user-provider";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

// Mock dependencies
jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(),
}));

// Test component to use the hook
function TestComponent() {
  const { user, profile, loading, updateProfile, refreshUser } = useUser();

  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "loaded"}</div>
      <div data-testid="user">{user ? user.email : "no user"}</div>
      <div data-testid="profile">
        {profile ? profile.first_name || "no name" : "no profile"}
      </div>
      <button onClick={() => updateProfile({ first_name: "Updated" })}>
        Update Profile
      </button>
      <button onClick={refreshUser}>Refresh User</button>
    </div>
  );
}

const mockUser: User = {
  id: "test-user-id",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: "2023-01-01T00:00:00.000Z",
  last_sign_in_at: "2023-01-01T00:00:00.000Z",
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: "2023-01-01T00:00:00.000Z",
  updated_at: "2023-01-01T00:00:00.000Z",
};

const mockProfile = {
  id: "test-user-id",
  avatar_url: null,
  created_at: "2023-01-01T00:00:00.000Z",
  favorite_regions: null,
  favorite_styles: null,
  favorite_varietals: null,
  first_name: "Test",
  last_name: "User",
  updated_at: "2023-01-01T00:00:00.000Z",
  wine_preferences: null,
};

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

describe("UserProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createBrowserClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it("throws error when useUser is used outside UserProvider", () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useUser must be used within a UserProvider");

    console.error = originalError;
  });

  it("provides initial loading state", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    // Initially should be loading
    expect(screen.getByTestId("loading")).toHaveTextContent("loading");
  });

  it("loads user and profile data on mount", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });

    const mockSingle = jest.fn().mockResolvedValue({
      data: mockProfile,
    });
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("Test");
    });

    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("id", "test-user-id");
  });

  it("handles no user scenario", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("user")).toHaveTextContent("no user");
    expect(screen.getByTestId("profile")).toHaveTextContent("no profile");
  });

  it("updates profile state with updateProfile function", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });

    const mockSingle = jest.fn().mockResolvedValue({
      data: mockProfile,
    });
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("Test");
    });

    // Click update profile button
    const updateButton = screen.getByText("Update Profile");
    act(() => {
      updateButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("Updated");
    });
  });

  it("refreshes user data with refreshUser function", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });

    const mockSingle = jest.fn().mockResolvedValue({
      data: mockProfile,
    });
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    // Clear previous calls
    jest.clearAllMocks();

    // Click refresh button
    const refreshButton = screen.getByText("Refresh User");
    act(() => {
      refreshButton.click();
    });

    await waitFor(() => {
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });
  });

  it("handles auth state changes", async () => {
    let authStateCallback: (event: string, session: any) => void = () => {};

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    });

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("no user");
    });

    // Simulate sign in
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });

    const mockSingle = jest.fn().mockResolvedValue({
      data: mockProfile,
    });
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

    act(() => {
      authStateCallback("SIGNED_IN", { user: mockUser });
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });
  });

  it("handles sign out", async () => {
    let authStateCallback: (event: string, session: any) => void = () => {};

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });

    const mockSingle = jest.fn().mockResolvedValue({
      data: mockProfile,
    });
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    });

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });

    // Simulate sign out
    act(() => {
      authStateCallback("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("no user");
    });

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("no profile");
    });
  });

  it("handles errors gracefully", async () => {
    mockSupabaseClient.auth.getUser.mockRejectedValue(new Error("Auth error"));

    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("user")).toHaveTextContent("no user");
    expect(screen.getByTestId("profile")).toHaveTextContent("no profile");

    console.error = originalError;
  });

  it("unsubscribes from auth changes on unmount", () => {
    const mockUnsubscribe = jest.fn();

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const { unmount } = render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
