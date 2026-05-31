import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { updateProfileAction } from "@/app/actions/profile";
import { TradeCheckboxes } from "@/components/TradeCheckboxes";
import { LocationPicker } from "@/components/LocationPicker";
import { tradesFromJson } from "@/lib/trades";

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser("/me/edit");
  const { error } = await searchParams;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Edit your profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          This is your individual profile - the person. Companies you sell through
          are separate pages.
        </p>

        {error === "name" && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Name is required.
          </p>
        )}

        <form action={updateProfileAction} className="mt-6 space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              name="name"
              required
              defaultValue={user.name}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Role / title <span className="text-slate-400">(optional)</span>
            </label>
            <input
              name="title"
              defaultValue={user.title ?? ""}
              placeholder="Owner, Estimator, Foreman…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Your trades
            </label>
            <TradeCheckboxes selected={tradesFromJson(user.trades)} />
          </div>

          <LocationPicker
            heading="Your area"
            defaultCity={user.city}
            defaultState={user.state}
            defaultLat={user.lat}
            defaultLng={user.lng}
            hint="Search and pick your city so others can find you locally."
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bio / credentials <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              name="bio"
              rows={4}
              defaultValue={user.bio ?? ""}
              placeholder="Licensed electrician, 12 years commercial…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Save profile
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
