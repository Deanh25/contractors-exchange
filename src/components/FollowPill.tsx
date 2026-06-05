import { toggleFollowAction } from "@/app/actions/follow";
import type { FollowTargetType } from "@/generated/prisma/client";

/**
 * A followed trade/area shown as a removable pill (PRD §4-§5). The whole pill is
 * an unfollow button with an explicit × so it's obvious it can be removed (and
 * that the change saves) - clearer than a plain toggle chip. Server-action form,
 * works without client JS; `path` is revalidated after removing.
 */
export function FollowPill({
  targetType,
  targetValue,
  label,
  path,
}: {
  targetType: FollowTargetType;
  targetValue: string;
  label: string;
  path: string;
}) {
  return (
    <form action={toggleFollowAction}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetValue" value={targetValue} />
      <input type="hidden" name="path" value={path} />
      <button
        type="submit"
        title={`Unfollow ${label}`}
        className="group inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        <span>{label}</span>
        <span
          aria-hidden
          className="grid h-4 w-4 place-items-center rounded-full text-brand-400 group-hover:bg-red-100 group-hover:text-red-600"
        >
          ✕
        </span>
      </button>
    </form>
  );
}
