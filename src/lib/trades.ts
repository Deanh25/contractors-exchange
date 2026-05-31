// Canonical trade vocabulary for CX. Modeled on the California CSLB contractor
// license classifications (General A/B/B-2 + the C-specialties) - the most
// complete, recognizable taxonomy of US construction contractor types - grouped
// into categories for the searchable picker.
//
// Slugs are STABLE identifiers stored on User.trades / Company.trades (JSON) and
// Listing.tradeCategory / Post.tradeTag. The original seven slugs (general,
// paving, concrete, electrical, plumbing, hvac, roofing) are preserved so
// existing records keep resolving.

export type Trade = { slug: string; label: string; category: string };

// Display order for category groups.
export const TRADE_CATEGORIES = [
  "General",
  "Site, Earthwork & Landscape",
  "Concrete & Masonry",
  "Structural & Metal",
  "Mechanical, Electrical & Plumbing",
  "Finishes & Exterior",
  "Specialty",
] as const;

export const TRADES: Trade[] = [
  // General
  { slug: "general-engineering", label: "General Engineering", category: "General" },
  { slug: "general", label: "General Building", category: "General" },
  { slug: "residential-remodeling", label: "Residential Remodeling", category: "General" },

  // Site, Earthwork & Landscape
  { slug: "paving", label: "Earthwork & Paving", category: "Site, Earthwork & Landscape" },
  { slug: "demolition", label: "Demolition", category: "Site, Earthwork & Landscape" },
  { slug: "fencing", label: "Fencing", category: "Site, Earthwork & Landscape" },
  { slug: "landscaping", label: "Landscaping", category: "Site, Earthwork & Landscape" },
  { slug: "parking-highway", label: "Parking & Highway Improvement", category: "Site, Earthwork & Landscape" },
  { slug: "traffic-control", label: "Construction Zone Traffic Control", category: "Site, Earthwork & Landscape" },
  { slug: "pipeline", label: "Pipeline", category: "Site, Earthwork & Landscape" },
  { slug: "well-drilling", label: "Water Well Drilling", category: "Site, Earthwork & Landscape" },
  { slug: "sanitation", label: "Sanitation System", category: "Site, Earthwork & Landscape" },

  // Concrete & Masonry
  { slug: "concrete", label: "Concrete", category: "Concrete & Masonry" },
  { slug: "masonry", label: "Masonry", category: "Concrete & Masonry" },
  { slug: "reinforcing-steel", label: "Reinforcing Steel", category: "Concrete & Masonry" },

  // Structural & Metal
  { slug: "framing", label: "Framing & Rough Carpentry", category: "Structural & Metal" },
  { slug: "structural-steel", label: "Structural Steel", category: "Structural & Metal" },
  { slug: "ornamental-metal", label: "Ornamental Metal", category: "Structural & Metal" },
  { slug: "welding", label: "Welding", category: "Structural & Metal" },

  // Mechanical, Electrical & Plumbing
  { slug: "electrical", label: "Electrical", category: "Mechanical, Electrical & Plumbing" },
  { slug: "low-voltage", label: "Low Voltage Systems", category: "Mechanical, Electrical & Plumbing" },
  { slug: "plumbing", label: "Plumbing", category: "Mechanical, Electrical & Plumbing" },
  { slug: "hvac", label: "HVAC", category: "Mechanical, Electrical & Plumbing" },
  { slug: "boiler-steam", label: "Boiler & Steam Fitting", category: "Mechanical, Electrical & Plumbing" },
  { slug: "refrigeration", label: "Refrigeration", category: "Mechanical, Electrical & Plumbing" },
  { slug: "sheet-metal", label: "Sheet Metal", category: "Mechanical, Electrical & Plumbing" },
  { slug: "solar", label: "Solar", category: "Mechanical, Electrical & Plumbing" },
  { slug: "fire-protection", label: "Fire Protection", category: "Mechanical, Electrical & Plumbing" },
  { slug: "elevator", label: "Elevator", category: "Mechanical, Electrical & Plumbing" },

  // Finishes & Exterior
  { slug: "drywall", label: "Drywall", category: "Finishes & Exterior" },
  { slug: "plastering", label: "Lathing & Plastering", category: "Finishes & Exterior" },
  { slug: "painting", label: "Painting & Decorating", category: "Finishes & Exterior" },
  { slug: "flooring", label: "Flooring & Floor Covering", category: "Finishes & Exterior" },
  { slug: "tile", label: "Tile (Ceramic & Mosaic)", category: "Finishes & Exterior" },
  { slug: "cabinet-millwork", label: "Cabinet & Finish Carpentry", category: "Finishes & Exterior" },
  { slug: "glazing", label: "Glazing", category: "Finishes & Exterior" },
  { slug: "insulation", label: "Insulation & Acoustical", category: "Finishes & Exterior" },
  { slug: "roofing", label: "Roofing", category: "Finishes & Exterior" },

  // Specialty
  { slug: "swimming-pool", label: "Swimming Pool", category: "Specialty" },
  { slug: "sign", label: "Sign", category: "Specialty" },
  { slug: "lock-security", label: "Lock & Security", category: "Specialty" },
  { slug: "water-conditioning", label: "Water Conditioning", category: "Specialty" },
  { slug: "asbestos-abatement", label: "Asbestos Abatement", category: "Specialty" },
  { slug: "manufactured-housing", label: "Manufactured Housing", category: "Specialty" },
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

/** Trades grouped by category, in canonical category order (for the picker). */
export function tradesByCategory(): { category: string; trades: Trade[] }[] {
  return TRADE_CATEGORIES.map((category) => ({
    category,
    trades: TRADES.filter((t) => t.category === category),
  }));
}

/** Trades as SearchSelect options (value=slug, label, group=category). */
export function tradeOptions(): { value: string; label: string; group: string }[] {
  return TRADES.map((t) => ({ value: t.slug, label: t.label, group: t.category }));
}
