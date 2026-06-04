import Link from "next/link";

/**
 * Friendly global 404 (PRD §8). Catches notFound() calls and unmatched routes -
 * e.g. a stale listing/order link after data changes - with a clear way back
 * instead of the bare default.
 */
export default function NotFound() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-6xl">🧭</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          This page no longer exists
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The listing, order, or page you were looking for may have been removed,
          or the link is out of date.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/listings"
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Browse marketplace
          </Link>
          <Link
            href="/orders"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Your orders
          </Link>
          <Link
            href="/"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
