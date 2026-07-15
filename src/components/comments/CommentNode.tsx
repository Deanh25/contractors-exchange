"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/time";
import { REACTIONS } from "@/lib/reactions";
import { ReactionIcon } from "@/components/reactions/ReactionIcon";
import { CommentLikeButton } from "./CommentLikeButton";
import { CommentComposer } from "./CommentComposer";
import { deleteCommentAction, editCommentAction } from "@/app/actions/engagement";
import type { CommentNode as Node } from "@/lib/engagement";

// Indent replies up to this depth; deeper ones render flat (the @mention keeps
// the context), LinkedIn-style, so nesting never runs off the screen.
const VISUAL_CAP = 3;

export function CommentNode({
  node,
  postId,
  canComment,
  actingLabel,
  onChanged,
}: {
  node: Node;
  postId: string;
  canComment: boolean;
  actingLabel?: string | null;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.body);
  const [pending, startWrite] = useTransition();
  const present = REACTIONS.filter((r) => node.reactions.byType[r.type]);

  function onDelete() {
    const fd = new FormData();
    fd.set("commentId", node.id);
    startWrite(async () => {
      await deleteCommentAction(fd);
      onChanged();
    });
  }

  function onSaveEdit() {
    if (!draft.trim()) return;
    const fd = new FormData();
    fd.set("commentId", node.id);
    fd.set("body", draft);
    startWrite(async () => {
      await editCommentAction(fd);
      setEditing(false);
      onChanged();
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <Link href={node.author.href} className="shrink-0">
          <Avatar
            name={node.author.name}
            src={node.author.avatar}
            size={32}
            rounded={node.author.kind === "company" ? "md" : "full"}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="relative w-fit max-w-full rounded-2xl bg-slate-100 px-3 py-2">
            <Link
              href={node.author.href}
              className="text-sm font-semibold text-slate-900 hover:underline"
            >
              {node.author.name}
            </Link>
            {editing ? (
              <div className="mt-1 w-72 max-w-full">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  autoFocus
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onSaveEdit}
                    disabled={pending || !draft.trim()}
                    className="rounded-md bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {pending ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(node.body);
                      setEditing(false);
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-line break-words text-sm text-slate-700">
                {node.mention && (
                  <Link
                    href={node.mention.href}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    @{node.mention.name}
                  </Link>
                )}
                {node.mention && " "}
                {node.body}
              </p>
            )}

            {node.reactions.total > 0 && (
              <div className="absolute -bottom-2 right-1 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 shadow-sm">
                {present.slice(0, 3).map((r) => (
                  <ReactionIcon
                    key={r.type}
                    icon={r.icon}
                    size={11}
                    strokeWidth={2.5}
                    style={{ color: r.color }}
                  />
                ))}
                <span className="text-[10px] font-medium text-slate-500">
                  {node.reactions.total}
                </span>
              </div>
            )}
          </div>

          {node.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={node.imageUrl}
              alt=""
              className="mt-2 max-h-72 rounded-lg border border-slate-200 object-cover"
            />
          )}

          <div className="mt-1.5 flex items-center gap-3 pl-3 text-[11px] text-slate-400">
            <span>{timeAgo(node.createdAt)}</span>
            <CommentLikeButton
              commentId={node.id}
              reactions={node.reactions}
              canReact={canComment}
              onChanged={onChanged}
            />
            {canComment && (
              <button
                type="button"
                onClick={() => setReplying((v) => !v)}
                className="font-semibold hover:text-slate-600"
              >
                Reply
              </button>
            )}
            {node.canEdit && !editing && (
              <button
                type="button"
                onClick={() => {
                  setDraft(node.body);
                  setConfirmingDelete(false);
                  setEditing(true);
                }}
                className="font-semibold hover:text-slate-600"
              >
                Edit
              </button>
            )}
            {node.canDelete &&
              (confirmingDelete ? (
                <span className="flex items-center gap-1.5">
                  <span>Delete?</span>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="font-semibold text-red-600 hover:text-red-700"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="hover:text-slate-600"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="font-semibold hover:text-red-600"
                >
                  Delete
                </button>
              ))}
          </div>

          {replying && canComment && (
            <div className="mt-2">
              <CommentComposer
                postId={postId}
                parentId={node.id}
                replyToCommentId={node.id}
                replyToName={node.author.name}
                actingLabel={actingLabel}
                autoFocus
                onPosted={() => {
                  setReplying(false);
                  onChanged();
                }}
              />
            </div>
          )}
        </div>
      </div>

      {node.replies.length > 0 && (
        <div
          className={`mt-3 space-y-3 ${
            node.depth < VISUAL_CAP ? "ml-4 border-l border-slate-100 pl-3" : ""
          }`}
        >
          {node.replies.map((r) => (
            <CommentNode
              key={r.id}
              node={r}
              postId={postId}
              canComment={canComment}
              actingLabel={actingLabel}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}
