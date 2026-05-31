import { METROS } from "@/lib/locations";

/** City/State inputs with metro suggestions (datalist — no client JS needed). */
export function LocationFields({
  city,
  state,
}: {
  city?: string | null;
  state?: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
        <input
          name="city"
          defaultValue={city ?? ""}
          list="metro-cities"
          placeholder="Phoenix"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <datalist id="metro-cities">
          {METROS.map((m) => (
            <option key={m.label} value={m.city} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">State</label>
        <input
          name="state"
          defaultValue={state ?? ""}
          list="metro-states"
          placeholder="AZ"
          maxLength={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
        />
        <datalist id="metro-states">
          {[...new Set(METROS.map((m) => m.state))].map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
