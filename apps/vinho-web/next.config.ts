import type { NextConfig } from "next";
import path from "path";

// Derive the Supabase host from the configured URL so image optimization
// works across environments (preview, staging, prod) rather than a single
// hardcoded project ref. Falls back to the production host at build time.
const supabaseHost = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
        "https://aghiopwrzzvamssgcwpv.supabase.co",
    ).hostname;
  } catch {
    return "aghiopwrzzvamssgcwpv.supabase.co";
  }
})();

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.vivino.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase limit to 10MB for wine label images
    },
  },
  async headers() {
    return [
      {
        // Apple App Site Association file for Universal Links and Shared Web Credentials
        source: '/.well-known/apple-app-site-association',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
