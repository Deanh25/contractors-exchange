import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { postAuthor, postMedia, postTags, type PostWithAuthor } from "@/lib/posts";
import { categoryLabel } from "@/lib/categories";
import { timeAgo } from "@/lib/time";
import { PostEngagementBar } from "@/components/PostEngagementBar";
import { PostMediaCarousel } from "@/components/PostMediaCarousel";
import { deletePostAction } from "@/app/actions/post";
import type { PostEngagement } from "@/lib/engagement";

/** A discussion post in the feed (PRD §4): author, body, optional image + tags. */
export async function PostCard({
  post,
  engagement,
  canReact = false,
  canComment = false,
  actingLabel = null,
  commentsOpen = false,
  canManage = false,
  backPath = "/feed",
  deleteBackPath,
  allowModeration = true,
}: {
  post: PostWithAuthor;
  /** Reaction/comment summary; when provided, the engagement bar renders. */
  engagement?: PostEngagement;
  canReact?: boolean;
  canComment?: boolean;
  /** Identity the viewer comments as (a company name), if not themselves. */
  actingLabel?: string | null;
  /** Pre-expand the inline thread (used on the post detail page). */
  commentsOpen?: boolean;
  /** Viewer owns this post: show the Edit / Delete menu (see `canManagePost`). */
  canManage?: boolean;
  /** Where Edit returns to after saving. */
  backPath?: string;
  /** Where Delete lands; defaults to `backPath`. Must differ on the post's own
   *  detail page, since the post won't exist to return to. */
  deleteBackPath?: string;
  /** Show the post owner's moderation delete on comments. Off on public profiles,
   *  which are read-only: moderation lives in the workspace Posts tab + feed. */
  allowModeration?: boolean;
}) {
  const author = postAuthor(post);
  const tags = postTags(post);
  const tradeName = post.tradeTag ? await categoryLabel(post.tradeTag) : null;

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
        {canManage && (
          <PostOwnerMenu
            postId={post.id}
            backPath={backPath}
            deleteBackPath={deleteBackPath ?? backPath}
          />
        )}
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

      <PostMediaCarousel media={postMedia(post)} />

      {(post.tradeTag || post.regionTag) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tradeTag && (
            <Link
              href={`/feed?trade=${post.tradeTag}`}
              className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {tradeName}
            </Link>
          )}
          {post.regionTag && (
            <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              📍 {post.regionTag}
            </span>
          )}
        </div>
      )}

      {engagement && (
        <PostEngagementBar
          postId={post.id}
          engagement={engagement}
          canReact={canReact}
          canComment={canComment}
          actingLabel={actingLabel}
          initialOpen={commentsOpen}
          allowModeration={allowModeration}
        />
      )}
    </article>
  );
}

/**
 * Owner-only "⋯" menu on a post: Edit (to the post editor) and Delete (with an
 * inline confirm step). Plain <details> so the card stays a server component.
 */
function PostOwnerMenu({
  postId,
  backPath,
  deleteBackPath,
}: {
  postId: string;
  backPath: string;
  deleteBackPath: string;
}) {
  return (
    <details className="relative shrink-0">
      <summary
        aria-label="Post options"
        className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <span aria-hidden>⋯</span>
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
        <Link
          href={`/posts/${postId}/edit?back=${encodeURIComponent(backPath)}`}
          className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Edit post
        </Link>
        <details>
          <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            Delete post
          </summary>
          <form
            action={deletePostAction}
            className="m-1 rounded-lg border border-red-200 bg-red-50 p-2"
          >
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="back" value={deleteBackPath} />
            <p className="text-xs text-red-700">Delete this post?</p>
            <button
              type="submit"
              className="mt-1.5 w-full rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              Yes, delete
            </button>
          </form>
        </details>
      </div>
    </details>
  );
}
