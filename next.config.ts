import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Listing media (images and short videos) upload through Server Actions; the
    // default body limit is 1MB. Allow larger submits to fit a video or two.
    serverActions: { bodySizeLimit: "96mb" },
  },
};

export default nextConfig;
