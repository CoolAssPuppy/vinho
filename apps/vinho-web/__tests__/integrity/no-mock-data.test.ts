import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// This test ensures we NEVER ship mock data or hardcoded wine names
describe("Mock Data Detection - Code Integrity Check", () => {
  const FORBIDDEN_PATTERNS = [
    // Wine names that should never be hardcoded
    {
      pattern: /Château Margaux|Chateau Margaux/gi,
      description: "Hardcoded Château Margaux",
    },
    {
      pattern: /Mock[Ww]ine|Test[Ww]ine(?!-test)|Fake[Ww]ine/gi,
      description: "Mock wine data",
    },
    {
      pattern: /setTimeout.*\d+.*producer.*=/gi,
      description: "Fake delayed wine data",
    },
    {
      pattern: /DispatchQueue\.main\.asyncAfter.*producer.*=/gi,
      description: "Fake delayed wine data (iOS)",
    },

    // Fake data patterns
    {
      pattern: /fake.*data|dummy.*data|sample.*wine(?!-test)/gi,
      description: "Fake/dummy data references",
    },
    {
      pattern: /TODO:.*implement|FIXME:.*real/gi,
      description: "Unfinished implementation TODOs",
    },

    // Hardcoded wine responses
    {
      pattern: /return\s*{\s*producer:\s*["'](?!Villa Oliveira)/gi,
      description: "Hardcoded producer return",
    },
    {
      pattern: /wine_name:\s*["'][^"']+["']\s*,.*year:\s*\d{4}/gi,
      description: "Hardcoded wine details",
    },
  ];

  const ALLOWED_FILES = [
    "__tests__", // Test files can have mock data
    "*.test.ts",
    "*.test.tsx",
    "*.spec.ts",
    "*.spec.tsx",
    "PreviewContainer.swift", // Preview/demo files
    "MockData.swift",
    "VinoTests", // iOS test directory
    "ProfileSubViews.swift", // Contains tasting note styles array which is not mock data
    "node_modules",
    ".next",
    "dist",
    "build",
  ];

  function shouldCheckFile(filePath: string): boolean {
    return !ALLOWED_FILES.some((pattern) => filePath.includes(pattern));
  }

  it("should not contain hardcoded wine names in production code", () => {
    // Search for Swift files
    const swiftFiles = execSync(
      'find ../vinho-ios -name "*.swift" -type f 2>/dev/null || true',
      { encoding: "utf8" },
    )
      .split("\n")
      .filter((file) => file && shouldCheckFile(file));

    // Search for TypeScript/JavaScript files
    const tsFiles = execSync(
      'find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | grep -v .next',
      { encoding: "utf8" },
    )
      .split("\n")
      .filter((file) => file && shouldCheckFile(file));

    const allFiles = [...swiftFiles, ...tsFiles];
    const violations: string[] = [];

    allFiles.forEach((filePath) => {
      if (!filePath || !fs.existsSync(filePath)) return;

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      FORBIDDEN_PATTERNS.forEach(({ pattern, description }) => {
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            violations.push(
              `${filePath}:${index + 1} - ${description}: "${line.trim()}"`,
            );
          }
        });
      });
    });

    if (violations.length > 0) {
      console.error("Found hardcoded/mock data in production code:");
      violations.forEach((v) => console.error(v));
    }

    expect(violations).toHaveLength(0);
  });

  it("should not have setTimeout or asyncAfter with wine data", () => {
    const swiftPattern =
      /DispatchQueue\.main\.asyncAfter.*\n.*producer\s*=|DispatchQueue\.main\.asyncAfter.*\n.*wineName\s*=/;
    const jsPattern =
      /setTimeout.*\n.*producer\s*=|setTimeout.*\n.*wineName\s*=/;

    const swiftFiles = execSync(
      'find ../vinho-ios -name "*.swift" -type f 2>/dev/null || true',
      { encoding: "utf8" },
    )
      .split("\n")
      .filter((file) => file && shouldCheckFile(file));

    const violations: string[] = [];

    swiftFiles.forEach((filePath) => {
      if (!filePath || !fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, "utf8");

      if (swiftPattern.test(content)) {
        violations.push(
          `${filePath} contains asyncAfter with wine data assignment`,
        );
      }
    });

    expect(violations).toHaveLength(0);
  });

  it("should have real API calls in scanner views", () => {
    const scannerFiles = [
      "../vinho-ios/Vinho/Views/Scanner/ScannerView.swift",
      "./app/scan/page.tsx",
    ];

    scannerFiles.forEach((filePath) => {
      if (!fs.existsSync(filePath)) return;

      const content = fs.readFileSync(filePath, "utf8");

      // Check for required API patterns
      const requiredPatterns = [
        /supabase.*storage.*upload|uploadImage|scanWineLabel/i,
        /wines_added_queue|process-wine-queue/,
        /invoke.*process-wine|scanWineLabel.*base64/,
      ];

      const hasRealAPI = requiredPatterns.some((pattern) =>
        pattern.test(content),
      );

      expect(hasRealAPI).toBe(true);

      // Ensure no fake delays
      expect(content).not.toMatch(/setTimeout.*[23]\d{3}.*producer/);
      expect(content).not.toMatch(/asyncAfter.*deadline.*2.*producer/);
    });
  });
});
