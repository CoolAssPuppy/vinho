import {
  calculatePasswordStrength,
  getPasswordRequirements,
} from "@/lib/validation/password";

describe("calculatePasswordStrength", () => {
  it("scores 0 (weak) for an empty password", () => {
    const result = calculatePasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.level).toBe("weak");
    expect(result.percentage).toBe(0);
  });

  it("scores 1 (weak) when only one rule is met", () => {
    // lowercase only: < 8 chars, no uppercase, no number
    const result = calculatePasswordStrength("abc");
    expect(result.score).toBe(1);
    expect(result.level).toBe("weak");
  });

  it("scores 2 (fair) when two rules are met", () => {
    // lowercase + number, but < 8 chars and no uppercase
    const result = calculatePasswordStrength("abc1");
    expect(result.score).toBe(2);
    expect(result.level).toBe("fair");
  });

  it("scores 3 (good) when three rules are met", () => {
    // 8+ chars, lowercase, uppercase, no number
    const result = calculatePasswordStrength("Abcdefgh");
    expect(result.score).toBe(3);
    expect(result.level).toBe("good");
  });

  it("scores 4 (strong) with length, lower, upper, and number", () => {
    const result = calculatePasswordStrength("Abcdef12");
    expect(result.score).toBe(4);
    expect(result.level).toBe("strong");
    expect(result.label).toBe("Strong");
    expect(result.percentage).toBe(100);
  });

  it("maps percentage to score/4", () => {
    expect(calculatePasswordStrength("Abcdefgh").percentage).toBe(75);
  });
});

describe("getPasswordRequirements", () => {
  it("marks every requirement met for a strong password", () => {
    const reqs = getPasswordRequirements("Abcdef12");
    expect(reqs.every((r) => r.met)).toBe(true);
    expect(reqs).toHaveLength(4);
  });

  it("marks the unmet requirements for a weak password", () => {
    const reqs = getPasswordRequirements("abc");
    const byRequirement = Object.fromEntries(
      reqs.map((r) => [r.requirement, r.met]),
    );
    expect(byRequirement["At least 8 characters"]).toBe(false);
    expect(byRequirement["One lowercase letter"]).toBe(true);
    expect(byRequirement["One uppercase letter"]).toBe(false);
    expect(byRequirement["One number"]).toBe(false);
  });
});
