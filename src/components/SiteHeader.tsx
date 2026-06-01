import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { Avatar } from "@/components/Avatar";
import { prisma } from "@/lib/prisma";

export async function SiteHeader() {
  const user = await getCurrentUser();
  // Pending incoming deal requests, surfaced as a badge on the Orders link.
  const pendingOrders = user
    ? await prisma.transaction.count({
        where: { sellerId: user.id, status: "pending" },
      })
    : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-500 font-black text-white">
            CX
          </span>
          <span className="hidden text-base font-bold tracking-tight sm:block">
            <span className="text-slate-900">Contractors </span>
            <span className="text-brand-500">Exchange</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium text-slate-500">
          <Link
            href="/listings"
            className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            Marketplace
          </Link>
          <Link
            href="/feed"
            className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            Feed
          </Link>
          {user && (
            <Link
              href="/messages"
              className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Messages
            </Link>
          )}
          {user && (
            <Link
              href="/orders"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Orders
              {pendingOrders > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-xs font-semibold text-white">
                  {pendingOrders}
                </span>
              )}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/listings/new"
                className="hidden rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:block"
              >
                + List
              </Link>
              <Link
                href="/me"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100"
              >
                <Avatar name={user.name} src={user.avatarUrl} size={28} />
                <span className="hidden text-sm font-medium text-slate-800 sm:block">
                  {user.name}
                </span>
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/signin"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
