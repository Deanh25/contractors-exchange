import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Listing photos are uploaded through Server Actions; the default body limit
    // is 1MB, which is too small for a few images. Allow up to ~32MB per submit.
    serverActions: { bodySizeLimit: "32mb" },
  },
};

export default nextConfig;
