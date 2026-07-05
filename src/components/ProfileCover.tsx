import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";

/**
 * Shared LinkedIn-style profile cover: full-width banner with an overlapping
 * profile photo (circle for users, rounded-square for companies), the identity
 * block (name + verified + subtitle + meta), follower/following counts, and an
 * `actions` slot the page fills with its own buttons (Follow/Contact/Edit). Used
 * by both /u/[id] and /company/[slug]; the page owns the action logic.
 */
export function ProfileCover({
  name,
  avatarUrl,
  bannerUrl,
  verified = false,
  shape = "circle",
  subtitle,
  meta,
  followers,
  following,
  followersHref,
  followingHref,
  actions,
}: {
  name: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  verified?: boolean;
  shape?: "circle" | "rounded";
  subtitle?: string | null;
  meta?: React.ReactNode;
  followers: number;
  following: number;
  followersHref: string;
  followingHref: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="h-32 w-full bg-gradient-to-r from-slate-200 to-slate-100 sm:h-44">
        {bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="px-6 pb-5">
        <div className="-mt-12">
          <div
            className={`inline-block bg-white p-1 ring-1 ring-slate-200 ${
              shape === "circle" ? "rounded-full" : "rounded-lg"
            }`}
          >
            <Avatar
              name={name}
              src={avatarUrl}
              size={88}
              rounded={shape === "circle" ? "full" : "md"}
            />
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{name}</h1>
              {verified && <VerifiedBadge />}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-sm font-medium text-slate-600">{subtitle}</p>
            )}
            {meta && <div className="mt-1 text-sm text-slate-500">{meta}</div>}
            <div className="mt-2 flex gap-4 text-sm text-slate-600">
              <Link href={followersHref} className="hover:underline">
                <span className="font-semibold text-slate-900">{followers}</span> followers
              </Link>
              <Link href={followingHref} className="hover:underline">
                <span className="font-semibold text-slate-900">{following}</span> following
              </Link>
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </section>
  );
}
