import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The admin portal is served on the admin.* subdomain (same app; see
  // src/proxy.ts). In dev it's reached via admin.localhost:3000, so allow that
  // origin to talk to the dev server (HMR + Server Actions). The github.dev
  // entry covers GitHub Codespaces forwarded ports (see .devcontainer/).
  allowedDevOrigins: ["admin.localhost", "*.app.github.dev"],
  experimental: {
    serverActions: {
      // Media (images and short videos) upload through Server Actions; the
      // default body limit is 1MB. A message video can be up to 100MB (see
      // MAX_VIDEO_BYTES), so allow headroom for that plus form overhead and a
      // second attachment.
      bodySizeLimit: "128mb",
      // Server Actions have their own CSRF origin check (separate from
      // allowedDevOrigins): Next aborts when the request `Origin` host differs
      // from `x-forwarded-host`/`host` unless the Origin is whitelisted here.
      // Behind the GitHub Codespaces port-forward proxy the two disagree: the
      // proxy sets `x-forwarded-host` to the public <name>-3000.app.github.dev
      // host, but the browser's `Origin` arrives as `localhost:3000` (and on a
      // direct visit, as the github.dev host). Allow every origin the dev box can
      // legitimately present so sign-in and all other actions work either way.
      // None of these are production hosts.
      allowedOrigins: [
        "*.app.github.dev",
        "localhost:3000",
        "127.0.0.1:3000",
        "admin.localhost:3000",
      ],
    },
  },
};

export default nextConfig;
