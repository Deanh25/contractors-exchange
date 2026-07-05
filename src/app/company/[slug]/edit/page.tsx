import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canActAs } from "@/lib/identity";
import { updateCompanyProfileAction } from "@/app/actions/profile";
import { TradeCheckboxes } from "@/components/TradeCheckboxes";
import { LocationPicker } from "@/components/LocationPicker";
import { ImageInput } from "@/components/ImageInput";
import { tradesFromJson } from "@/lib/trades";

const SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "500+"];

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export default async function EditCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const user = await requireUser(`/company/${slug}/edit`);

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  // Only an owner or a member granted canActAsCompany may edit.
  if (!(await canActAs(user.id, company.id))) redirect(`/company/${slug}`);

  const specialties = asStringList(company.specialties);
  const locations = asStringList(company.locations);
  const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Edit company profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">{company.name}</p>

        {error === "name" && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Company name is required.
          </p>
        )}

        <form action={updateCompanyProfileAction} className="mt-6 space-y-5">
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="slug" value={company.slug} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Logo <span className="text-slate-400">(optional)</span>
            </label>
            <ImageInput name="logo" label="🏢 Change logo" current={company.logoUrl} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Cover banner <span className="text-slate-400">(optional)</span>
            </label>
            <ImageInput
              name="banner"
              label="🖼 Change banner"
              current={company.bannerUrl}
              aspect="wide"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Company name</label>
            <input name="name" required defaultValue={company.name} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tagline <span className="text-slate-400">(optional)</span>
            </label>
            <input
              name="tagline"
              defaultValue={company.tagline ?? ""}
              placeholder="Commercial electrical, done right"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Website <span className="text-slate-400">(optional)</span>
              </label>
              <input
                name="website"
                defaultValue={company.website ?? ""}
                placeholder="https://example.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Founded <span className="text-slate-400">(year)</span>
              </label>
              <input
                name="foundedYear"
                type="number"
                defaultValue={company.foundedYear ?? ""}
                placeholder="2012"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Team size <span className="text-slate-400">(optional)</span>
            </label>
            <select name="size" defaultValue={company.size ?? ""} className={inputCls}>
              <option value="">Not specified</option>
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} people
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Trades</label>
            <TradeCheckboxes selected={tradesFromJson(company.trades)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Specialties <span className="text-slate-400">(one per line or comma-separated)</span>
            </label>
            <textarea
              name="specialties"
              rows={3}
              defaultValue={specialties.join("\n")}
              placeholder={"Panel upgrades\nEV chargers\nGenerator installs"}
              className={inputCls}
            />
          </div>

          <LocationPicker
            heading="Headquarters"
            defaultCity={company.city}
            defaultState={company.state}
            defaultLat={company.lat}
            defaultLng={company.lng}
            hint="Where the company is based."
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Service area <span className="text-slate-400">(free text)</span>
            </label>
            <input
              name="serviceArea"
              defaultValue={company.serviceArea ?? ""}
              placeholder="Charlotte metro + surrounding counties"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Other locations <span className="text-slate-400">(one per line or comma-separated)</span>
            </label>
            <textarea
              name="locations"
              rows={2}
              defaultValue={locations.join("\n")}
              placeholder={"Charlotte, NC\nRaleigh, NC"}
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              About <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              name="description"
              rows={4}
              defaultValue={company.description ?? ""}
              placeholder="What the company does, who it serves…"
              className={inputCls}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Save company
            </button>
            <Link
              href={`/company/${slug}`}
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
