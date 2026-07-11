import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

// This test ensures we NEVER ship mock data or hardcoded wine names in the
// production web app. It scans only the web app's production source directories
// (app/, components/, lib/) and deliberately excludes anything that is allowed
// to contain sample data: tests, dev scripts, preview/story files, build output,
// and everything outside this app (iOS/Android sources, monorepo tooling).
describe("Mock Data Detection - Code Integrity Check", () => {
  const FORBIDDEN_PATTERNS: { pattern: RegExp; description: string }[] = [
    {
      pattern: /Château Margaux|Chateau Margaux/i,
      description: "Hardcoded Château Margaux",
    },
    {
      pattern: /Mock[Ww]ine|Test[Ww]ine(?!-test)|Fake[Ww]ine/i,
      description: "Mock wine data",
    },
    {
      pattern: /setTimeout.*\d+.*producer.*=/i,
      description: "Fake delayed wine data",
    },
    {
      pattern: /fake.*data|dummy.*data|sample.*wine(?!-test)/i,
      description: "Fake/dummy data references",
    },
    {
      pattern: /TODO:.*implement|FIXME:.*real/i,
      description: "Unfinished implementation TODOs",
    },
    {
      pattern: /return\s*{\s*producer:\s*["'](?!Villa Oliveira)/i,
      description: "Hardcoded producer return",
    },
    {
      pattern: /wine_name:\s*["'][^"']+["']\s*,.*year:\s*\d{4}/i,
      description: "Hardcoded wine details",
    },
  ];

  // Only production web source lives here.
  const PRODUCTION_DIRS = ["app", "components", "lib"];
  const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

  // Paths that legitimately contain sample data or are not production source.
  const EXCLUDED_PATH_SEGMENTS = [
    `${path.sep}scripts${path.sep}`,
    `${path.sep}__tests__${path.sep}`,
    `${path.sep}node_modules${path.sep}`,
    `${path.sep}.next${path.sep}`,
  ];

  function isExcluded(filePath: string): boolean {
    if (EXCLUDED_PATH_SEGMENTS.some((seg) => filePath.includes(seg))) {
      return true;
    }
    const base = path.basename(filePath).toLowerCase();
    if (base.includes(".test.") || base.includes(".spec.")) return true;
    if (base.includes("preview") || base.includes(".stories.")) return true;
    return false;
  }

  function collectSourceFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (isExcluded(fullPath + path.sep)) continue;

      if (entry.isDirectory()) {
        files.push(...collectSourceFiles(fullPath));
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        if (!isExcluded(fullPath)) files.push(fullPath);
      }
    }

    return files;
  }

  function getWebProductionFiles(): string[] {
    return PRODUCTION_DIRS.flatMap((dir) =>
      collectSourceFiles(path.join(process.cwd(), dir)),
    );
  }

  it("should not contain hardcoded wine names in production web code", () => {
    const files = getWebProductionFiles();
    const violations: string[] = [];

    files.forEach((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const relativePath = path.relative(process.cwd(), filePath);

      FORBIDDEN_PATTERNS.forEach(({ pattern, description }) => {
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            violations.push(
              `${relativePath}:${index + 1} - ${description}: "${line.trim()}"`,
            );
          }
        });
      });
    });

    if (violations.length > 0) {
      console.error("Found hardcoded/mock data in production web code:");
      violations.forEach((v) => console.error(v));
    }

    expect(violations).toHaveLength(0);
  });

  it("should not fake wine data with delayed timers in production web code", () => {
    const files = getWebProductionFiles();
    const fakeDelayPattern = /setTimeout[\s\S]{0,120}?(producer|wineName|wine_name)\s*[:=]/;
    const violations: string[] = [];

    files.forEach((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      if (fakeDelayPattern.test(content)) {
        violations.push(
          `${path.relative(process.cwd(), filePath)} contains a delayed timer that assigns wine data`,
        );
      }
    });

    expect(violations).toHaveLength(0);
  });

  it("should have real API calls in the web scanner view", () => {
    const scannerFile = path.join(process.cwd(), "app", "scan", "page.tsx");

    if (!fs.existsSync(scannerFile)) return;

    const content = fs.readFileSync(scannerFile, "utf8");

    const requiredPatterns = [
      /supabase.*storage.*upload|uploadImage|scanWineLabel/i,
      /wines_added_queue|process-wine-queue/,
      /invoke.*process-wine|scanWineLabel.*base64/,
    ];

    const hasRealAPI = requiredPatterns.some((pattern) =>
      pattern.test(content),
    );

    expect(hasRealAPI).toBe(true);

    // Ensure no fake delays feeding wine data.
    expect(content).not.toMatch(/setTimeout.*[23]\d{3}.*producer/);
  });
});
