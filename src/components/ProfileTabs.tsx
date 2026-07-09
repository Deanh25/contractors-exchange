import Link from "next/link";

/**
 * Shared horizontal tab bar for profiles (LinkedIn-style). The bar and its
 * navigation live here (Part 2); each tab's CONTENT is rendered by the page.
 * "home" is the default and omits the ?tab param for a clean URL.
 */
export type ProfileTabKey =
  | "home"
  | "about"
  | "posts"
  | "photos"
  | "listings"
  | "reviews";

export const PROFILE_TABS: { key: ProfileTabKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "about", label: "About" },
  { key: "posts", label: "Posts" },
  { key: "photos", label: "Photos" },
  { key: "listings", label: "Listings" },
  { key: "reviews", label: "Reviews" },
];

export function parseProfileTab(v: string | undefined): ProfileTabKey {
  return PROFILE_TABS.some((t) => t.key === v) ? (v as ProfileTabKey) : "home";
}

export function ProfileTabs({
  basePath,
  active,
  query,
}: {
  basePath: string;
  active: ProfileTabKey;
  /**
   * Extra query params to carry on every tab link (e.g. `{ view: "public" }` so
   * an owner previewing their public profile stays in preview when switching tabs
   * instead of dropping back into the acting-as workspace).
   */
  query?: Record<string, string>;
}) {
  return (
    <nav className="mt-4 flex flex-wrap gap-1 border-b border-slate-200">
      {PROFILE_TABS.map((t) => {
        const on = t.key === active;
        const params = new URLSearchParams(query);
        if (t.key !== "home") params.set("tab", t.key);
        const qs = params.toString();
        const href = qs ? `${basePath}?${qs}` : basePath;
        return (
          <Link
            key={t.key}
            href={href}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              on
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
