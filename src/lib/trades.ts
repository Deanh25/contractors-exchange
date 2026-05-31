// Canonical trade vocabulary (PRD §10 seed list). Slugs are stored on
// User.trades / Company.trades (JSON) and Listing.tradeCategory (string).

export type Trade = { slug: string; label: string };

export const TRADES: Trade[] = [
  { slug: "paving", label: "Paving" },
  { slug: "concrete", label: "Concrete" },
  { slug: "electrical", label: "Electrical" },
  { slug: "plumbing", label: "Plumbing" },
  { slug: "hvac", label: "HVAC" },
  { slug: "roofing", label: "Roofing" },
  { slug: "general", label: "General Contracting" },
];

const BY_SLUG = new Map(TRADES.map((t) => [t.slug, t]));

export function tradeLabel(slug: string): string {
  return BY_SLUG.get(slug)?.label ?? slug;
}

/** Keep only known trade slugs, de-duplicated, preserving canonical order. */
export function normalizeTrades(slugs: string[]): string[] {
  const set = new Set(slugs);
  return TRADES.filter((t) => set.has(t.slug)).map((t) => t.slug);
}

/** Read a User/Company `trades` JSON column into a string[]. */
export function tradesFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}
