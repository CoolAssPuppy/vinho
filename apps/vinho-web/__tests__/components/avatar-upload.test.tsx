import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";

// Mock dependencies
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(),
}));

const mockSupabaseClient = {
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
  from: jest.fn(() => ({
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
};

describe("AvatarUpload Component", () => {
  const defaultProps = {
    userId: "test-user-id",
    currentAvatarUrl: null,
    onAvatarUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createBrowserClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it("renders upload button and file input", () => {
    render(<AvatarUpload {...defaultProps} />);

    expect(screen.getByText("Upload Avatar")).toBeInTheDocument();
    expect(
      screen.getByText("JPG, PNG up to 2MB. Recommended: 400x400px"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /upload avatar/i }),
    ).toBeInTheDocument();
  });

  it("displays current avatar when provided", () => {
    const propsWithAvatar = {
      ...defaultProps,
      currentAvatarUrl: "https://example.com/avatar.jpg",
    };

    render(<AvatarUpload {...propsWithAvatar} />);

    const avatarImage = screen.getByAltText("Avatar");
    expect(avatarImage).toBeInTheDocument();
    expect(avatarImage).toHaveAttribute(
      "src",
      "https://example.com/avatar.jpg",
    );
  });

  it("displays remove button when avatar exists", () => {
    const propsWithAvatar = {
      ...defaultProps,
      currentAvatarUrl: "https://example.com/avatar.jpg",
    };

    render(<AvatarUpload {...propsWithAvatar} />);

    const removeButton = screen.getByRole("button", { name: "" }); // X button has no text
    expect(removeButton).toBeInTheDocument();
  });

  it("does not display remove button when no avatar", () => {
    render(<AvatarUpload {...defaultProps} />);

    const removeButtons = screen.queryAllByRole("button");
    expect(removeButtons).toHaveLength(1); // Only upload button
  });

  it("validates file type on upload", async () => {
    render(<AvatarUpload {...defaultProps} />);

    const fileInput = screen.getByRole("button", { name: /upload avatar/i });
    const hiddenInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // Create a non-image file
    const invalidFile = new File(["content"], "test.txt", {
      type: "text/plain",
    });

    // Mock the file input
    Object.defineProperty(hiddenInput, "files", {
      value: [invalidFile],
      configurable: true,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Please select an image file");
    });
  });

  it("validates file size on upload", async () => {
    render(<AvatarUpload {...defaultProps} />);

    const hiddenInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // Create a large file (3MB)
    const largeFile = new File(["x".repeat(3 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });

    Object.defineProperty(hiddenInput, "files", {
      value: [largeFile],
      configurable: true,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "File size must be less than 2MB",
      );
    });
  });

  it("successfully uploads valid image file", async () => {
    const mockStorageFrom = mockSupabaseClient.storage.from as jest.Mock;
    const mockUpload = jest.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: "https://example.com/new-avatar.jpg" },
    });
    const mockRemove = jest.fn().mockResolvedValue({ error: null });

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
      getPublicUrl: mockGetPublicUrl,
    });

    const mockFromUpdate = mockSupabaseClient.from as jest.Mock;
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockFromUpdate.mockReturnValue({ update: mockUpdate });

    render(<AvatarUpload {...defaultProps} />);

    const hiddenInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // Create a valid image file
    const validFile = new File(["image content"], "avatar.jpg", {
      type: "image/jpeg",
    });

    Object.defineProperty(hiddenInput, "files", {
      value: [validFile],
      configurable: true,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^test-user-id\/\d+\.jpg$/),
        validFile,
        { cacheControl: "3600", upsert: false },
      );
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        avatar_url: "https://example.com/new-avatar.jpg",
        updated_at: expect.any(String),
      });
    });

    await waitFor(() => {
      expect(defaultProps.onAvatarUpdate).toHaveBeenCalledWith(
        "https://example.com/new-avatar.jpg",
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Avatar updated successfully!",
      );
    });
  });

  it("removes old avatar when uploading new one", async () => {
    const propsWithAvatar = {
      ...defaultProps,
      currentAvatarUrl:
        "https://example.com/storage/v1/object/public/avatars/test-user-id/old-avatar.jpg",
    };

    const mockStorageFrom = mockSupabaseClient.storage.from as jest.Mock;
    const mockUpload = jest.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: "https://example.com/new-avatar.jpg" },
    });
    const mockRemove = jest.fn().mockResolvedValue({ error: null });

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
      getPublicUrl: mockGetPublicUrl,
    });

    const mockFromUpdate = mockSupabaseClient.from as jest.Mock;
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockFromUpdate.mockReturnValue({ update: mockUpdate });

    render(<AvatarUpload {...propsWithAvatar} />);

    const hiddenInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const validFile = new File(["image content"], "avatar.jpg", {
      type: "image/jpeg",
    });

    Object.defineProperty(hiddenInput, "files", {
      value: [validFile],
      configurable: true,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith(["test-user-id/old-avatar.jpg"]);
    });
  });

  it("removes avatar successfully", async () => {
    const propsWithAvatar = {
      ...defaultProps,
      currentAvatarUrl:
        "https://example.com/storage/v1/object/public/avatars/test-user-id/avatar.jpg",
    };

    const mockStorageFrom = mockSupabaseClient.storage.from as jest.Mock;
    const mockRemove = jest.fn().mockResolvedValue({ error: null });

    mockStorageFrom.mockReturnValue({
      remove: mockRemove,
    });

    const mockFromUpdate = mockSupabaseClient.from as jest.Mock;
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockFromUpdate.mockReturnValue({ update: mockUpdate });

    render(<AvatarUpload {...propsWithAvatar} />);

    const removeButton = screen.getByRole("button", { name: "" }); // X button
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith(["test-user-id/avatar.jpg"]);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        avatar_url: null,
        updated_at: expect.any(String),
      });
    });

    await waitFor(() => {
      expect(propsWithAvatar.onAvatarUpdate).toHaveBeenCalledWith(null);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Avatar removed successfully!",
      );
    });
  });

  it("handles upload errors gracefully", async () => {
    const mockStorageFrom = mockSupabaseClient.storage.from as jest.Mock;
    const mockUpload = jest.fn().mockResolvedValue({
      error: { message: "Upload failed" },
    });

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
    });

    render(<AvatarUpload {...defaultProps} />);

    const hiddenInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const validFile = new File(["image content"], "avatar.jpg", {
      type: "image/jpeg",
    });

    Object.defineProperty(hiddenInput, "files", {
      value: [validFile],
      configurable: true,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Upload failed");
    });
  });

  it("handles database update errors gracefully", async () => {
    const mockStorageFrom = mockSupabaseClient.storage.from as jest.Mock;
    const mockUpload = jest.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: "https://example.com/new-avatar.jpg" },
    });

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      remove: jest.fn(),
      getPublicUrl: mockGetPublicUrl,
    });

    const mockFromUpdate = mockSupabaseClient.from as jest.Mock;
    const mockEq = jest.fn().mockResolvedValue({
      error: { message: "Database update failed" },
    });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockFromUpdate.mockReturnValue({ update: mockUpdate });

    render(<AvatarUpload {...defaultProps} />);

    const hiddenInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const validFile = new File(["image content"], "avatar.jpg", {
      type: "image/jpeg",
    });

    Object.defineProperty(hiddenInput, "files", {
      value: [validFile],
      configurable: true,
    });

    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Database update failed");
    });
  });
});
