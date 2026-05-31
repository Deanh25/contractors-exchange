import { SearchSelect } from "@/components/SearchSelect";
import { tradeOptions } from "@/lib/trades";

/**
 * Multi-select trade picker (searchable, grouped by category). Submits the
 * chosen trade slugs as repeated `trades` fields - same contract the profile,
 * company, and onboarding actions already read via formData.getAll("trades").
 */
export function TradeCheckboxes({ selected = [] }: { selected?: string[] }) {
  return (
    <SearchSelect
      name="trades"
      multiple
      options={tradeOptions()}
      defaultValue={selected}
      placeholder="Search trades (e.g. electrical, paving)…"
    />
  );
}
