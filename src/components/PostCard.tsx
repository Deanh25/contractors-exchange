import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { postAuthor, postTags, type PostWithAuthor } from "@/lib/posts";
import { tradeLabel } from "@/lib/trades";
import { timeAgo } from "@/lib/time";

/** A discussion post in the feed (PRD §4): author, body, optional image + tags. */
export function PostCard({ post }: { post: PostWithAuthor }) {
  const author = postAuthor(post);
  const tags = postTags(post);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        {author && (
          <Avatar
            name={author.name}
            src={author.avatarUrl}
            size={40}
            rounded={author.kind === "company" ? "md" : "full"}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {author ? (
              <Link
                href={author.href}
                className="truncate text-sm font-semibold text-slate-900 hover:underline"
              >
                {author.name}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-slate-900">Someone</span>
            )}
            {author?.verified && <VerifiedBadge />}
          </div>
          <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          Discussion
        </span>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm text-slate-800">{post.body}</p>

      {tags.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          with{" "}
          {tags.map((t, i) => (
            <span key={`${t.kind}-${t.href}`}>
              {i > 0 && ", "}
              <Link
                href={t.href}
                className="font-medium text-brand-700 hover:underline"
              >
                @{t.name}
              </Link>
            </span>
          ))}
        </p>
      )}

      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt=""
          className="mt-3 max-h-96 w-full rounded-lg border border-slate-200 object-cover"
        />
      )}

      {(post.tradeTag || post.regionTag) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tradeTag && (
            <Link
              href={`/feed?trade=${post.tradeTag}`}
              className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {tradeLabel(post.tradeTag)}
            </Link>
          )}
          {post.regionTag && (
            <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              📍 {post.regionTag}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
