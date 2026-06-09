import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Host routing for the admin portal (Next 16 "proxy", formerly middleware).
 *
 * The admin backend lives on its OWN subdomain (admin.<domain>) but is the SAME
 * Next app, same code, same database. Detection is host-pattern based: any Host
 * beginning "admin." is the admin portal. This works in dev via
 * admin.localhost:3000 (browsers resolve *.localhost to loopback automatically)
 * and in production the moment DNS points admin.<domain> at the app - no code
 * change when the domain is purchased.
 *
 * Why a subdomain rather than just a /admin path:
 *  - separate cookie scope: cx_session is host-only, so the admin session is NOT
 *    shared with the public site (a marketplace XSS can't read the admin cookie),
 *  - a clean network boundary to lock down later (IP allowlist, WAF, 2FA).
 *
 * This proxy ONLY routes by host. It is NOT authorization: every admin route and
 * Server Action still checks the role server-side (requireAdmin / requireCapability),
 * per the Next docs' warning never to rely on proxy for authz.
 *
 *  - On the admin host: serve only /admin/* and /signin; bounce anything else to /admin.
 *  - On the public host: /admin is reachable ONLY by redirecting to the admin host.
 */

function isAdminHost(host: string): boolean {
  return host.startsWith("admin.");
}

// Dev-only escape hatch: a single-host dev environment (e.g. GitHub Codespaces)
// has no admin.* subdomain, so CX_DEV_ADMIN_ON_PATH=1 serves /admin directly on
// the public host instead of redirecting to the subdomain. NEVER set in
// production: it drops the admin-cookie isolation the subdomain provides. Role
// checks (requireAdmin / requireCapability) still apply either way.
const DEV_ADMIN_ON_PATH = process.env.CX_DEV_ADMIN_ON_PATH === "1";

/** Paths the admin subdomain may serve (sign-in is needed to authenticate). */
function adminHostAllows(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/signin" ||
    pathname.startsWith("/signin/")
  );
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;

  if (isAdminHost(host)) {
    if (adminHostAllows(pathname)) return NextResponse.next();
    // Public route requested on the admin host: send to the admin home.
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Public host: the admin section is only reachable on the admin subdomain,
  // except in a single-host dev environment (CX_DEV_ADMIN_ON_PATH) where /admin
  // is served directly here.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (DEV_ADMIN_ON_PATH) return NextResponse.next();
    const adminHost = "admin." + host.replace(/^www\./, "");
    const isHttps =
      request.nextUrl.protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https";
    const scheme = isHttps ? "https" : "http";
    return NextResponse.redirect(`${scheme}://${adminHost}${pathname}${search}`);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals, favicon, and uploaded
  // media (so static assets and uploads load regardless of host).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
