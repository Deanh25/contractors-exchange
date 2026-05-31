import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { completeOnboardingAction } from "@/app/actions/onboarding";
import { TradeCheckboxes } from "@/components/TradeCheckboxes";
import { LocationFields } from "@/components/LocationFields";
import { tradesFromJson } from "@/lib/trades";

export default async function WelcomePage() {
  const user = await requireUser("/welcome");

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Welcome to Contractors Exchange
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Tune your feed
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick the trades you work in and your area. We&apos;ll follow them for you
          so your feed shows relevant listings and discussion right away — you can
          change these anytime.
        </p>

        <form action={completeOnboardingAction} className="mt-6 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Trades you work in
            </label>
            <TradeCheckboxes selected={tradesFromJson(user.trades)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Your area
            </label>
            <LocationFields city={user.city} state={user.state} />
            <p className="mt-1 text-xs text-slate-400">
              We follow your state so nearby activity shows up in your feed.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Show my feed →
            </button>
            <Link
              href="/feed"
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Skip for now
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
