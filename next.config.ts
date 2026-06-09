import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The admin portal is served on the admin.* subdomain (same app; see
  // src/proxy.ts). In dev it's reached via admin.localhost:3000, so allow that
  // origin to talk to the dev server (HMR + Server Actions). The github.dev
  // entry covers GitHub Codespaces forwarded ports (see .devcontainer/).
  allowedDevOrigins: ["admin.localhost", "*.app.github.dev"],
  experimental: {
    serverActions: {
      // Listing media (images and short videos) upload through Server Actions;
      // the default body limit is 1MB. Allow larger submits for a video or two.
      bodySizeLimit: "96mb",
      // Server Actions have their own CSRF origin check (separate from
      // allowedDevOrigins). Behind the Codespaces proxy the request Origin is
      // *.app.github.dev while the internal Host differs, so allow it here.
      allowedOrigins: ["*.app.github.dev"],
    },
  },
};

export default nextConfig;
