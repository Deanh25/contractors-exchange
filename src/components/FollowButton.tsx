import { toggleFollowAction } from "@/app/actions/follow";
import type { FollowTargetType } from "@/generated/prisma/client";

/**
 * Follow / unfollow toggle (PRD §4). A plain server-action form, so it works
 * without client JS. `path` is the page to revalidate after toggling.
 *
 * - Default: a Follow/Following button (profiles, company pages).
 * - `pill`: a compact selectable chip used for trade toggles in the feed sidebar.
 */
export function FollowButton({
  targetType,
  targetValue,
  following,
  path,
  label,
  pill = false,
}: {
  targetType: FollowTargetType;
  targetValue: string;
  following: boolean;
  path: string;
  label?: string; // shown after "Follow" (button) or as the chip text (pill)
  pill?: boolean;
}) {
  const cls = pill
    ? following
      ? "rounded-full border border-brand-500 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800"
      : "rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
    : following
      ? "rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      : "rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600";

  const text = pill
    ? label ?? targetValue
    : following
      ? "Following"
      : `Follow${label ? ` ${label}` : ""}`;

  return (
    <form action={toggleFollowAction}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetValue" value={targetValue} />
      <input type="hidden" name="path" value={path} />
      <button type="submit" className={cls}>
        {pill && following && <span aria-hidden>✓ </span>}
        {text}
      </button>
    </form>
  );
}
