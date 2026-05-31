import { TRADES } from "@/lib/trades";

/** Multi-select trade checkboxes for forms. Submits as repeated `trades` fields. */
export function TradeCheckboxes({ selected = [] }: { selected?: string[] }) {
  const set = new Set(selected);
  return (
    <div className="flex flex-wrap gap-2">
      {TRADES.map((t) => (
        <label
          key={t.slug}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800"
        >
          <input
            type="checkbox"
            name="trades"
            value={t.slug}
            defaultChecked={set.has(t.slug)}
            className="accent-brand-600"
          />
          {t.label}
        </label>
      ))}
    </div>
  );
}
