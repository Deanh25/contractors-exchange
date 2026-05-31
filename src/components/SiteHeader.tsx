import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { Avatar } from "@/components/Avatar";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-500 font-black text-white">
            CX
          </span>
          <span className="hidden text-base font-bold tracking-tight text-slate-900 sm:block">
            Contractors Exchange
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium text-slate-500">
          <Link
            href="/listings"
            className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            Marketplace
          </Link>
          <span className="cursor-not-allowed rounded-md px-3 py-1.5 opacity-50">Feed</span>
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
