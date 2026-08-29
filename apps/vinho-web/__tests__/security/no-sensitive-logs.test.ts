import fs from "fs";
import path from "path";
import { describe, expect, it } from "@jest/globals";

describe("Sensitive production logs", () => {
  it("does not log Apple identity values or relay email addresses", () => {
    const sourcePath = path.resolve(
      process.cwd(),
      "../../supabase/functions/apple-auth-notifications/index.ts",
    );
    const source = fs.readFileSync(sourcePath, "utf8");
    const logLines = source
      .split("\n")
      .filter((line) => /console\.(log|info|warn|error)/.test(line));

    expect(logLines.join("\n")).not.toMatch(/event\.(sub|email)|user\.id|userId/);
  });
});
