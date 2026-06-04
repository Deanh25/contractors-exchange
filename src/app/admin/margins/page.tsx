import { requireCapability } from "@/lib/admin";
import { getAllCategoryMargins, DEFAULT_MARGIN_PCT } from "@/lib/pricing";
import { TRADES, tradeLabel } from "@/lib/trades";
import {
  setCategoryMarginAction,
  removeCategoryMarginAction,
} from "@/app/actions/admin-margins";

export default async function AdminMarginsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireCapability("margins");
  const sp = await searchParams;
  const margins = await getAllCategoryMargins();
  const configured = Object.keys(margins).length;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Margins</h1>
      <p className="mt-1 text-sm text-slate-500">
        The flat CX margin % per trade category. Buyer price = seller net x (1 +
        margin%). Changes apply to{" "}
        <span className="font-medium text-slate-700">future listings only</span> -
        existing listings keep their stored margin. Categories without a row use
        the code default ({DEFAULT_MARGIN_PCT}%).
      </p>

      {sp.error === "input" && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Enter a valid margin percentage (0 or more).
        </p>
      )}

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
        {configured} of {TRADES.length} categories configured
      </p>

      <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {TRADES.map((t) => {
          const set = margins[t.slug];
          const value = set ?? DEFAULT_MARGIN_PCT;
          return (
            <div
              key={t.slug}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{tradeLabel(t.slug)}</p>
                <p className="text-xs text-slate-400">
                  {set !== undefined ? "Configured" : `Default (${DEFAULT_MARGIN_PCT}%)`}
                </p>
              </div>
              <form
                action={setCategoryMarginAction}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="category" value={t.slug} />
                <div className="relative">
                  <input
                    name="marginPct"
                    inputMode="decimal"
                    defaultValue={value}
                    className="w-24 rounded-md border border-slate-300 px-2 py-1.5 pr-6 text-right text-sm"
                  />
                  <span className="pointer-events-none absolute right-2 top-1.5 text-sm text-slate-400">
                    %
                  </span>
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Save
                </button>
              </form>
              {set !== undefined && (
                <form action={removeCategoryMarginAction}>
                  <input type="hidden" name="category" value={t.slug} />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600"
                  >
                    Reset
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
