"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { commentOnPostAction } from "@/app/actions/engagement";
import { EmojiPicker } from "./EmojiPicker";

/**
 * Inline comment composer (LinkedIn-style): text + emoji + one image. Used for
 * top-level comments and replies. Replies pass replyToCommentId, which the
 * server resolves into the auto-tag; the chip shows who is being mentioned.
 * Submits the existing Server Action with an `inline` flag so it stays put.
 */
export function CommentComposer({
  postId,
  parentId = null,
  replyToCommentId = null,
  replyToName = null,
  actingLabel,
  onPosted,
  autoFocus = false,
}: {
  postId: string;
  parentId?: string | null;
  replyToCommentId?: string | null;
  replyToName?: string | null;
  actingLabel?: string | null;
  onPosted?: () => void;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState("");
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const isReply = !!replyToCommentId;

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (image) URL.revokeObjectURL(image.url);
    setImage(file ? { file, url: URL.createObjectURL(file) } : null);
  }
  function clearImage() {
    if (image) URL.revokeObjectURL(image.url);
    setImage(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(formData: FormData) {
    if (!body.trim() && !image) return;
    start(async () => {
      await commentOnPostAction(formData);
      setBody("");
      clearImage();
      onPosted?.();
    });
  }

  return (
    <form action={submit} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="inline" value="1" />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      {replyToCommentId && (
        <input type="hidden" name="replyToCommentId" value={replyToCommentId} />
      )}

      {replyToName && (
        <p className="text-xs text-slate-500">
          Replying to{" "}
          <span className="font-semibold text-brand-700">@{replyToName}</span>
        </p>
      )}

      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus={autoFocus}
        rows={isReply ? 1 : 2}
        placeholder={isReply ? "Write a reply..." : "Add a comment..."}
        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      {image && (
        <div className="relative h-20 w-20 overflow-hidden rounded-md border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={clearImage}
            aria-label="Remove image"
            className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <EmojiPicker onPick={(e) => setBody((b) => b + e)} />
          <label
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Attach image"
            title="Attach image"
          >
            <ImagePlus size={18} />
            <input
              ref={fileRef}
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={pickImage}
              className="hidden"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          {actingLabel && (
            <span className="text-xs text-slate-500">as {actingLabel}</span>
          )}
          <button
            type="submit"
            disabled={pending || (!body.trim() && !image)}
            className="rounded-md bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {pending ? "Posting..." : isReply ? "Reply" : "Comment"}
          </button>
        </div>
      </div>
    </form>
  );
}
