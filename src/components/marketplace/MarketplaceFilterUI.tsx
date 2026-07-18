import type { TaxCategory } from "@/lib/taxonomy";

/**
 * Presentational pieces for the Marketplace filter rail (the navy sidebar in the
 * approved redesign). These are plain server components: uncontrolled checkboxes
 * whose current DOM state is read by the enclosing FilterForm on change, so no
 * client state lives here. `defaultChecked` reflects the active query params.
 */

const chevron = (
  <svg
    className="ml-auto h-4 w-4 text-white/45 transition-transform duration-200 group-open:rotate-90"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

/** A collapsible filter group in the navy rail. */
export function RailGroup({
  label,
  open = false,
  children,
}: {
  label: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group border-b border-white/10 last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-[15px] font-semibold tracking-tight text-white select-none hover:bg-white/5">
        {label}
        {chevron}
      </summary>
      <div className="px-5 pb-4 pt-0.5">{children}</div>
    </details>
  );
}

/** A single checkbox row. */
export function CheckRow({
  name,
  value,
  label,
  checked,
  accent = false,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  accent?: boolean;
}) {
  return (
    <label className="-mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5 hover:text-white">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="h-[17px] w-[17px] flex-none accent-brand-500"
      />
      <span className={accent ? "font-medium text-brand-400" : undefined}>
        {label}
      </span>
    </label>
  );
}

/**
 * A 2-level taxonomy tree (Products/Materials or Equipment). Each category is an
 * expandable node with an "All <category>" checkbox (submits `cat`) plus a
 * checkbox per sub-category (submits `sub`). A category opens automatically when
 * it or one of its sub-categories is selected.
 */
export function TaxonomyFilter({
  categories,
  selectedCats,
  selectedSubs,
}: {
  categories: TaxCategory[];
  selectedCats: Set<string>;
  selectedSubs: Set<string>;
}) {
  return (
    <div className="flex flex-col">
      {categories.map((cat) => {
        const catOn = selectedCats.has(cat.slug);
        const anySub = cat.subcategories.some((s) => selectedSubs.has(s.slug));
        return (
          <details key={cat.slug} open={catOn || anySub} className="group/cat">
            <summary className="-mx-2 flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-200 select-none hover:bg-white/5 group-open/cat:text-white">
              {cat.label}
              <svg
                className="ml-auto h-3.5 w-3.5 text-white/40 transition-transform duration-200 group-open/cat:rotate-90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </summary>
            <div className="mb-2 ml-2.5 border-l border-white/10 pl-3.5">
              <CheckRow
                name="cat"
                value={cat.slug}
                label={`All ${cat.label}`}
                checked={catOn}
                accent
              />
              {cat.subcategories.map((s) => (
                <CheckRow
                  key={s.slug}
                  name="sub"
                  value={s.slug}
                  label={s.label}
                  checked={selectedSubs.has(s.slug)}
                />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
