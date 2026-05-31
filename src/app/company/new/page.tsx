import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createCompanyAction } from "@/app/actions/company";
import { TradeCheckboxes } from "@/components/TradeCheckboxes";
import { LocationPicker } from "@/components/LocationPicker";

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser("/company/new");
  const { error } = await searchParams;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create a company page
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          A company page is an optional business identity - a storefront with its
          own listings and team. You can sell, bid, and trade as yourself too;
          individuals and companies use the same tools and pay the same commission.
          You&apos;ll be set as the owner.
        </p>

        {error === "name" && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Company name is required.
          </p>
        )}

        <form action={createCompanyAction} className="mt-6 space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Company name
            </label>
            <input
              name="name"
              required
              autoFocus
              placeholder="Rivera Paving Co."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Trades served
            </label>
            <TradeCheckboxes />
          </div>

          <LocationPicker
            heading="Primary location"
            hint="The city your company is based in or primarily serves."
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Service area <span className="text-slate-400">(optional)</span>
            </label>
            <input
              name="serviceArea"
              placeholder="Phoenix metro + 100 mi"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              name="description"
              rows={4}
              placeholder="What the company does, capabilities, years in business…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Create company
            </button>
            <Link
              href="/me"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
