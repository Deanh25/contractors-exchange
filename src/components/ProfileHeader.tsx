import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { tradeLabel, tradesFromJson } from "@/lib/trades";
import { metroLabel } from "@/lib/locations";

type ProfileLike = {
  name: string;
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  state?: string | null;
  trades?: unknown;
  verified?: boolean;
};

export function ProfileHeader({ profile }: { profile: ProfileLike }) {
  const trades = tradesFromJson(profile.trades);
  const location = metroLabel(profile.city, profile.state);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <Avatar name={profile.name} src={profile.avatarUrl} size={72} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {profile.name}
          </h1>
          {profile.verified && <VerifiedBadge />}
        </div>
        {profile.title && (
          <p className="text-sm font-medium text-slate-600">{profile.title}</p>
        )}
        {location && (
          <p className="mt-1 text-sm text-slate-500">📍 {location}</p>
        )}
        {trades.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {trades.map((t) => (
              <span
                key={t}
                className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700"
              >
                {tradeLabel(t)}
              </span>
            ))}
          </div>
        )}
        {profile.bio && (
          <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
            {profile.bio}
          </p>
        )}
      </div>
    </div>
  );
}
