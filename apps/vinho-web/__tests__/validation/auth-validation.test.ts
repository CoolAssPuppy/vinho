import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRequired,
  getAuthErrorMessage,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "@/lib/validation/auth";

describe("validateEmail", () => {
  it("accepts a normal address", () => {
    expect(validateEmail("wine@example.com")).toEqual({ isValid: true });
  });

  it("trims surrounding whitespace before validating", () => {
    expect(validateEmail("  wine@example.com  ")).toEqual({ isValid: true });
  });

  it("rejects an empty or whitespace-only value as required", () => {
    expect(validateEmail("")).toEqual({
      isValid: false,
      error: "Email is required",
    });
    expect(validateEmail("   ")).toEqual({
      isValid: false,
      error: "Email is required",
    });
  });

  it.each(["notanemail", "missing@tld", "@example.com", "spaces in@email.com"])(
    "rejects malformed address %p",
    (bad) => {
      const result = validateEmail(bad);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Please enter a valid email address");
    },
  );
});

describe("validatePassword", () => {
  it("accepts a password meeting every rule", () => {
    expect(validatePassword("Abcdef12")).toEqual({ isValid: true, errors: [] });
  });

  it("reports 'required' and short-circuits when empty", () => {
    expect(validatePassword("")).toEqual({
      isValid: false,
      errors: ["Password is required"],
    });
  });

  it(`flags a password shorter than ${PASSWORD_MIN_LENGTH} characters`, () => {
    const result = validatePassword("Ab1cd");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  });

  it(`flags a password longer than ${PASSWORD_MAX_LENGTH} characters`, () => {
    const longPassword = "Aa1" + "x".repeat(PASSWORD_MAX_LENGTH);
    const result = validatePassword(longPassword);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      `Password must be less than ${PASSWORD_MAX_LENGTH} characters`,
    );
  });

  it("requires a lowercase letter", () => {
    expect(validatePassword("ABCDEF12").errors).toContain(
      "Password must contain a lowercase letter",
    );
  });

  it("requires an uppercase letter", () => {
    expect(validatePassword("abcdef12").errors).toContain(
      "Password must contain an uppercase letter",
    );
  });

  it("requires a number", () => {
    expect(validatePassword("Abcdefgh").errors).toContain(
      "Password must contain a number",
    );
  });

  it("accumulates every failing rule at once", () => {
    const result = validatePassword("abc");
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        "Password must contain an uppercase letter",
        "Password must contain a number",
      ]),
    );
  });
});

describe("validatePasswordMatch", () => {
  it("passes when both values are identical", () => {
    expect(validatePasswordMatch("Secret123", "Secret123")).toEqual({
      isValid: true,
    });
  });

  it("fails when the values differ", () => {
    expect(validatePasswordMatch("Secret123", "Secret124")).toEqual({
      isValid: false,
      error: "Passwords do not match",
    });
  });
});

describe("validateRequired", () => {
  it("passes for a non-empty value", () => {
    expect(validateRequired("Prashant", "First name")).toEqual({
      isValid: true,
    });
  });

  it("fails for whitespace-only input, naming the field", () => {
    expect(validateRequired("   ", "First name")).toEqual({
      isValid: false,
      error: "First name is required",
    });
  });
});

describe("getAuthErrorMessage", () => {
  it("maps a known Supabase error to a friendly message", () => {
    expect(getAuthErrorMessage({ message: "Invalid login credentials" })).toBe(
      "Invalid email or password. Please try again.",
    );
  });

  it("maps captcha errors", () => {
    expect(getAuthErrorMessage({ message: "captcha_failed" })).toBe(
      "Captcha verification failed. Please try again.",
    );
  });

  it("passes through an unmapped message unchanged", () => {
    expect(getAuthErrorMessage({ message: "Some novel error" })).toBe(
      "Some novel error",
    );
  });
});
