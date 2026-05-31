import { createPostAction } from "@/app/actions/post";
import { Avatar } from "@/components/Avatar";
import { TRADES } from "@/lib/trades";
import { METROS } from "@/lib/locations";

const STATES = [...new Set(METROS.map((m) => m.state))];
const selectCls =
  "rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700";

/**
 * Compact discussion-post composer for the top of the feed (PRD §4). Posts can be
 * authored as the individual or a company they own, optionally tagged by trade
 * and region so they reach the right followers.
 */
export function PostComposer({
  userName,
  avatarUrl,
  companies,
}: {
  userName: string;
  avatarUrl: string | null;
  companies: { id: string; name: string }[];
}) {
  return (
    <form
      action={createPostAction}
      encType="multipart/form-data"
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex gap-3">
        <Avatar name={userName} src={avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Share an update, ask the trades a question…"
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {companies.length > 0 && (
              <select name="owner" defaultValue="self" className={selectCls}>
                <option value="self">As {userName}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    As {c.name}
                  </option>
                ))}
              </select>
            )}

            <select name="tradeTag" defaultValue="" className={selectCls}>
              <option value="">Trade (optional)</option>
              {TRADES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>

            <select name="regionTag" defaultValue="" className={selectCls}>
              <option value="">Region (optional)</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label className="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              📷 Photo
              <input
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
              />
            </label>

            <button
              type="submit"
              className="ml-auto rounded-md bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
