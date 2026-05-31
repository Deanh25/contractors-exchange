import Link from "next/link";
import { requireUser, getUserCompanies } from "@/lib/auth";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Avatar } from "@/components/Avatar";
import { tradesFromJson } from "@/lib/trades";

export default async function MyProfilePage() {
  const user = await requireUser("/me");
  const memberships = await getUserCompanies(user.id);

  const incomplete =
    !user.title && !user.bio && tradesFromJson(user.trades).length === 0;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Profile card */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your profile
            </span>
            <div className="flex gap-2">
              <Link
                href={`/u/${user.id}`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View public
              </Link>
              <Link
                href="/me/edit"
                className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Edit profile
              </Link>
            </div>
          </div>
          <ProfileHeader profile={user} />
          <p className="mt-4 text-xs text-slate-400">{user.email}</p>

          {incomplete && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Your profile is a bit empty.{" "}
              <Link href="/me/edit" className="font-semibold underline">
                Add your trades, location, and bio
              </Link>{" "}
              so others can find you.
            </p>
          )}
        </section>

        {/* Companies */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Your companies
            </h2>
            <Link
              href="/company/new"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              + Create company page
            </Link>
          </div>

          {memberships.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              You&apos;re not part of any company yet. A company page is the
              business that sells and holds the commission account.{" "}
              <Link href="/company/new" className="font-semibold text-slate-700 underline">
                Create one →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {memberships.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/company/${m.company.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                  >
                    <Avatar name={m.company.name} src={m.company.logoUrl} size={40} rounded="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">
                        {m.company.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {m.role === "owner" ? "Owner" : "Member"}
                      </p>
                    </div>
                    <span className="text-slate-400">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
