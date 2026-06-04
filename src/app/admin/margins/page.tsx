import { requireCapability } from "@/lib/admin";
import { getAllCategoryMargins, DEFAULT_MARGIN_PCT } from "@/lib/pricing";
import { TRADES, TRADE_CATEGORIES } from "@/lib/trades";
import { MarginsManager, type MarginItem } from "@/components/MarginsManager";

export default async function AdminMarginsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireCapability("margins");
  const sp = await searchParams;
  const margins = await getAllCategoryMargins();

  const items: MarginItem[] = TRADES.map((t) => ({
    slug: t.slug,
    label: t.label,
    category: t.category,
    configured: margins[t.slug] ?? null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Margins</h1>
      <p className="mt-1 text-sm text-slate-500">
        The flat CX margin % per trade. Buyer price = seller net x (1 + margin%).
        Changes apply to{" "}
        <span className="font-medium text-slate-700">future listings only</span> -
        existing listings keep their stored margin.
      </p>

      {sp.error === "input" && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Enter a valid margin percentage (0 or more).
        </p>
      )}

      <div className="mt-4">
        <MarginsManager
          items={items}
          categories={TRADE_CATEGORIES}
          defaultPct={DEFAULT_MARGIN_PCT}
        />
      </div>
    </div>
  );
}
