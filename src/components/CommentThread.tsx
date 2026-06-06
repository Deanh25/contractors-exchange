import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/time";
import { commentOnPostAction } from "@/app/actions/engagement";
import type { CommentNode } from "@/lib/engagement";

/**
 * Comments on a post (PRD §4): top-level comments with one level of replies,
 * each attributed to a party. The composer posts as the viewer's acting identity.
 */
export function CommentThread({
  postId,
  comments,
  canComment,
  actingLabel,
}: {
  postId: string;
  comments: CommentNode[];
  canComment: boolean;
  /** The identity the viewer will comment as (e.g. a company name), if not self. */
  actingLabel?: string | null;
}) {
  const count = comments.reduce((n, c) => n + 1 + c.replies.length, 0);
  return (
    <section id="comments" className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {count} {count === 1 ? "comment" : "comments"}
      </h2>

      {canComment ? (
        <Composer postId={postId} actingLabel={actingLabel} />
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
          <Link href={`/signin?next=/posts/${postId}`} className="font-medium text-brand-700 underline">
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      <div className="mt-4 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400">No comments yet. Start the conversation.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id}>
              <CommentRow node={c} />
              {canComment && (
                <details className="ml-11 mt-1">
                  <summary className="cursor-pointer list-none text-xs font-medium text-slate-500 hover:text-slate-700">
                    Reply
                  </summary>
                  <div className="mt-2">
                    <Composer postId={postId} parentId={c.id} actingLabel={actingLabel} compact />
                  </div>
                </details>
              )}
              {c.replies.length > 0 && (
                <div className="ml-11 mt-3 space-y-3 border-l border-slate-100 pl-3">
                  {c.replies.map((r) => (
                    <CommentRow key={r.id} node={r} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function CommentRow({ node }: { node: CommentNode }) {
  return (
    <div className="flex gap-3">
      <Link href={node.author.href} className="shrink-0">
        <Avatar
          name={node.author.name}
          src={node.author.avatar}
          size={32}
          rounded={node.author.kind === "company" ? "md" : "full"}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-slate-100 px-3 py-2">
          <Link href={node.author.href} className="text-sm font-semibold text-slate-900 hover:underline">
            {node.author.name}
          </Link>
          <p className="whitespace-pre-line text-sm text-slate-700">{node.body}</p>
        </div>
        <p className="mt-0.5 pl-3 text-[11px] text-slate-400">{timeAgo(node.createdAt)}</p>
      </div>
    </div>
  );
}

function Composer({
  postId,
  parentId,
  actingLabel,
  compact,
}: {
  postId: string;
  parentId?: string;
  actingLabel?: string | null;
  compact?: boolean;
}) {
  return (
    <form action={commentOnPostAction} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea
        name="body"
        required
        rows={compact ? 1 : 2}
        placeholder={parentId ? "Write a reply…" : "Add a comment…"}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-md bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          {parentId ? "Reply" : "Comment"}
        </button>
        {actingLabel && (
          <span className="text-xs text-slate-500">as {actingLabel}</span>
        )}
      </div>
    </form>
  );
}
