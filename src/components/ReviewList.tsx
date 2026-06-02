import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { StarRating } from "@/components/StarRating";
import { timeAgo } from "@/lib/time";
import type { Review, User, Company } from "@/generated/prisma/client";

export type ReviewWithContext = Review & {
  raterUser: User;
  raterCompany: Company | null;
  transaction: { listing: { id: string; title: string } | null } | null;
};

/** A list of reviews about someone (PRD §7), each tagged with the product the
 * deal was about (public, to build credibility). The reviewer can be a person
 * or a company (when written acting as one). */
export function ReviewList({ reviews }: { reviews: ReviewWithContext[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
        No reviews yet. Reviews come from completed deals.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {reviews.map((r) => {
        const listing = r.transaction?.listing ?? null;
        const rater = r.raterCompany
          ? {
              name: r.raterCompany.name,
              avatarUrl: r.raterCompany.logoUrl,
              href: `/company/${r.raterCompany.slug}`,
              rounded: "md" as const,
            }
          : {
              name: r.raterUser.name,
              avatarUrl: r.raterUser.avatarUrl,
              href: `/u/${r.raterUser.id}`,
              rounded: "full" as const,
            };
        return (
          <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <Avatar
                name={rater.name}
                src={rater.avatarUrl}
                size={28}
                rounded={rater.rounded}
              />
              <Link
                href={rater.href}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                {rater.name}
              </Link>
              <span className="ml-auto">
                <StarRating rating={r.stars} showNumber={false} />
              </span>
            </div>
            {listing && (
              <Link
                href={`/listings/${listing.id}`}
                className="mt-1.5 inline-block max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                Deal: {listing.title}
              </Link>
            )}
            {r.body && <p className="mt-2 text-sm text-slate-700">{r.body}</p>}
            <p className="mt-1 text-xs text-slate-400">{timeAgo(r.createdAt)}</p>
          </li>
        );
      })}
    </ul>
  );
}
