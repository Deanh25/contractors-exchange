import { SearchSelect } from "@/components/SearchSelect";
import { getLeafOptions } from "@/lib/categories";

/**
 * Multi-select trade picker (searchable, grouped by category). Submits the
 * chosen leaf-category slugs as repeated `trades` fields - same contract the
 * profile, company, and onboarding actions read via formData.getAll("trades").
 */
export async function TradeCheckboxes({ selected = [] }: { selected?: string[] }) {
  const options = await getLeafOptions();
  return (
    <SearchSelect
      name="trades"
      multiple
      options={options}
      defaultValue={selected}
      placeholder="Search trades (e.g. electrical, paving)…"
    />
  );
}
