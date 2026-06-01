import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { StarRating } from "@/components/StarRating";
import { timeAgo } from "@/lib/time";
import type { Review, User } from "@/generated/prisma/client";

/** A list of reviews about someone (PRD §7). */
export function ReviewList({
  reviews,
}: {
  reviews: (Review & { rater: User })[];
}) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
        No reviews yet. Reviews come from completed deals.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <Avatar name={r.rater.name} src={r.rater.avatarUrl} size={28} />
            <Link
              href={`/u/${r.raterId}`}
              className="text-sm font-medium text-slate-900 hover:underline"
            >
              {r.rater.name}
            </Link>
            <span className="ml-auto">
              <StarRating rating={r.stars} showNumber={false} />
            </span>
          </div>
          {r.body && <p className="mt-2 text-sm text-slate-700">{r.body}</p>}
          <p className="mt-1 text-xs text-slate-400">{timeAgo(r.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
