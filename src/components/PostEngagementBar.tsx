import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ReactionControl } from "@/components/reactions/ReactionControl";
import { ReactionSummary } from "@/components/reactions/ReactionSummary";
import type { PostEngagement } from "@/lib/engagement";

/**
 * Reaction + comment bar under a post (PRD §4). LinkedIn-style: a single React
 * button reveals an animated reaction flyout; the summary cluster opens the
 * "who reacted" list. This stays a SERVER component and mounts client islands
 * for the interactive bits. Inline comments arrive in Part B.
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
  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      {(engagement.total > 0 || engagement.commentCount > 0) && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
          <ReactionSummary
            postId={postId}
            byType={engagement.byType}
            total={engagement.total}
          />
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
          <ReactionControl postId={postId} current={engagement.viewerReaction} />
        ) : (
          <Link
            href="/signin?next=/feed"
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            React
          </Link>
        )}

        <Link
          href={commentHref}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <MessageCircle size={18} strokeWidth={2} />
          Comment
        </Link>
      </div>
    </div>
  );
}
