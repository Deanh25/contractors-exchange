import Link from "next/link";
import { reactToPostAction } from "@/app/actions/engagement";
import { REACTIONS, REACTION_EMOJI, type PostEngagement } from "@/lib/engagement";

/**
 * Reaction + comment bar under a post (PRD §4). Reactions are a hover/click
 * picker (4 types); the viewer's current reaction is highlighted and clicking it
 * again removes it. Comment links to the post's thread. Server-rendered with
 * server-action forms (works without JS). Share is added in Phase 2.
 */
export function PostEngagementBar({
  postId,
  engagement,
  canReact,
  commentHref,
}: {
  postId: string;
  engagement: PostEngagement;
  canReact: boolean;
  commentHref: string;
}) {
  const presentEmojis = REACTIONS.filter((r) => engagement.byType[r.type]).map(
    (r) => r.emoji,
  );
  const current = engagement.viewerReaction;
  const currentMeta = current ? REACTIONS.find((r) => r.type === current) : null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      {(engagement.total > 0 || engagement.commentCount > 0) && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
          <span>
            {presentEmojis.length > 0 && (
              <span className="mr-1">{presentEmojis.join("")}</span>
            )}
            {engagement.total > 0 && engagement.total}
          </span>
          {engagement.commentCount > 0 && (
            <Link href={commentHref} className="hover:underline">
              {engagement.commentCount}{" "}
              {engagement.commentCount === 1 ? "comment" : "comments"}
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {canReact ? (
          <details className="group relative">
            <summary
              className={`flex cursor-pointer list-none items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                current
                  ? "text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {currentMeta ? (
                <>
                  {currentMeta.emoji} {currentMeta.label}
                </>
              ) : (
                <>👍 React</>
              )}
            </summary>
            <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg">
              {REACTIONS.map((r) => (
                <form action={reactToPostAction} key={r.type}>
                  <input type="hidden" name="postId" value={postId} />
                  <input type="hidden" name="type" value={r.type} />
                  <button
                    type="submit"
                    title={r.label}
                    className={`grid h-9 w-9 place-items-center rounded-full text-lg transition hover:scale-110 hover:bg-slate-100 ${
                      current === r.type ? "bg-brand-50 ring-1 ring-brand-300" : ""
                    }`}
                  >
                    {r.emoji}
                  </button>
                </form>
              ))}
            </div>
          </details>
        ) : (
          <Link
            href="/signin?next=/feed"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            👍 React
          </Link>
        )}

        <Link
          href={commentHref}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          💬 Comment
        </Link>
      </div>
    </div>
  );
}

export { REACTION_EMOJI };
