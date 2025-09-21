import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: {
    // This helps with monorepo setups
    outputFileTracingIncludes: {
      "/": ["../../node_modules/**/*"],
    },
  },
};

export default nextConfig;
