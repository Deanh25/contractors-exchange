"use client";

/**
 * Sort control for the results header. Its own GET form (separate from the
 * filters form) that carries the current search/filter params as hidden inputs,
 * so changing the sort re-runs the same query with the new order. Auto-submits
 * on change - no extra button.
 */
export function SortSelect({
  sort,
  options,
  params,
}: {
  sort: string;
  options: { value: string; label: string }[];
  params: Record<string, string | undefined>;
}) {
  return (
    <form method="get" className="flex items-center gap-1.5">
      {Object.entries(params).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <label htmlFor="sort" className="text-xs font-medium text-slate-500">
        Sort
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={sort}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
