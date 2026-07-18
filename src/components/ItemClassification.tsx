"use client";

import { useState } from "react";
import { SearchSelect } from "@/components/SearchSelect";

type Cat = {
  slug: string;
  label: string;
  subcategories: { slug: string; label: string }[];
};
type Kind = "" | "product" | "equipment";

/**
 * Marketplace classification picker for the listing form (src/lib/taxonomy.ts).
 * A listing is Trade + EITHER one Product OR one Equipment category, never both, so
 * the kind is a single choice that swaps which category tree is offered. Picking a
 * category reveals its optional sub-category. Submits `itemKind`, `categorySlug`, and
 * `subcategorySlug` as hidden inputs (the shim validates them against the taxonomy).
 */
export function ItemClassification({
  productCats,
  equipmentCats,
  defaultKind = "",
  defaultCategory = "",
  defaultSub = "",
}: {
  productCats: Cat[];
  equipmentCats: Cat[];
  defaultKind?: Kind;
  defaultCategory?: string;
  defaultSub?: string;
}) {
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [category, setCategory] = useState<string>(defaultCategory);

  const cats =
    kind === "product" ? productCats : kind === "equipment" ? equipmentCats : [];
  const catOptions = cats.map((c) => ({ value: c.slug, label: c.label }));
  const subOptions = (
    cats.find((c) => c.slug === category)?.subcategories ?? []
  ).map((s) => ({ value: s.slug, label: s.label }));

  function pickKind(next: Kind) {
    if (next === kind) return;
    setKind(next);
    setCategory(""); // reset the dependent pickers when the tree changes
  }

  const kinds: { value: Kind; label: string; hint: string }[] = [
    { value: "product", label: "Product / Material", hint: "Something you sell or trade" },
    { value: "equipment", label: "Equipment", hint: "A machine to sell or rent" },
    { value: "", label: "Neither", hint: "A service or other" },
  ];

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        What are you listing?
      </label>
      <p className="mb-2 text-xs text-slate-400">
        Pick a Product/Material or Equipment category so the right buyers find it. A
        listing is one or the other, never both.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {kinds.map((k) => {
          const active = kind === k.value;
          return (
            <button
              key={k.label}
              type="button"
              onClick={() => pickKind(k.value)}
              aria-pressed={active}
              className={`rounded-lg border p-3 text-left transition ${
                active
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                  : "border-slate-300 bg-white hover:bg-slate-50"
              }`}
            >
              <span
                className={`block text-sm font-semibold ${
                  active ? "text-brand-800" : "text-slate-700"
                }`}
              >
                {k.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{k.hint}</span>
            </button>
          );
        })}
      </div>
      <input type="hidden" name="itemKind" value={kind} />

      {kind && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {kind === "product" ? "Product / Material" : "Equipment"} category
            </label>
            <SearchSelect
              key={kind}
              name="categorySlug"
              options={catOptions}
              defaultValue={category ? [category] : []}
              onChange={(v) => setCategory(v[0] ?? "")}
              placeholder="Search a category…"
            />
          </div>
          {category && subOptions.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Sub-category <span className="text-slate-400">(optional)</span>
              </label>
              <SearchSelect
                key={`${kind}:${category}`}
                name="subcategorySlug"
                options={subOptions}
                defaultValue={
                  defaultSub && subOptions.some((o) => o.value === defaultSub)
                    ? [defaultSub]
                    : []
                }
                placeholder="Search a sub-category… (optional)"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
