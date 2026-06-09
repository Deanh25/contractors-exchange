import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The admin portal is served on the admin.* subdomain (same app; see
  // src/proxy.ts). In dev it's reached via admin.localhost:3000, so allow that
  // origin to talk to the dev server (HMR + Server Actions). The github.dev
  // entry covers GitHub Codespaces forwarded ports (see .devcontainer/).
  allowedDevOrigins: ["admin.localhost", "*.app.github.dev"],
  experimental: {
    // Listing media (images and short videos) upload through Server Actions; the
    // default body limit is 1MB. Allow larger submits to fit a video or two.
    serverActions: { bodySizeLimit: "96mb" },
  },
};

export default nextConfig;
