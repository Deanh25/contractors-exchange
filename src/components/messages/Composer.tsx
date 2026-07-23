"use client";

import { useEffect, useRef, useState } from "react";
import { X, Image as ImageIcon, Paperclip, FileText } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import { EmojiButton } from "@/components/EmojiButton";
import { formatBytes } from "@/lib/chat";

/**
 * Sticky conversation composer. Round 2 made sending optimistic, so this only
 * collects input and hands the FormData up; Conversation.tsx owns the send.
 *
 * Layout is Facebook Messenger's, and deliberately so (Dean, 07/22/2026): the
 * text input NEVER changes size. Picked files sit in a FIXED-HEIGHT tray ABOVE
 * the input that scrolls sideways when there are several, so attaching a dozen
 * files can't grow the box or push the Send button off screen. The action icons
 * (photo, file, emoji) live in a row BELOW the input, each a quiet Option A
 * ghost button with a tooltip.
 */

/** Composer grows to this height with typed text, then scrolls internally. */
const MAX_COMPOSER_PX = 140;

const PHOTO_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
const FILE_ACCEPT =
  "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain";

type Picked = {
  id: string;
  file: File;
  /** Object URL for images/videos; null for documents. */
  preview: string | null;
  isVideo: boolean;
  isFile: boolean;
};

export function Composer({
  threadId,
  replyingAs,
  onSend,
  onTyping,
  autoFocus = false,
  replyTo = null,
  onCancelReply,
}: {
  threadId: string;
  /** Set when replying as a company, so the sender identity is obvious. */
  replyingAs?: string | null;
  onSend: (formData: FormData) => void | Promise<void>;
  /** Throttled upstream; called as the user types so the other side sees it. */
  onTyping?: () => void;
  /** True after a send remounts this composer, to keep the caret in the box. */
  autoFocus?: boolean;
  /** Round 3: the message being replied to, shown above the input. */
  replyTo?: { id: string; author: string; excerpt: string } | null;
  onCancelReply?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const [items, setItems] = useState<Picked[]>([]);

  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  // Release object URLs when the composer unmounts (it remounts per send).
  useEffect(() => {
    return () => {
      for (const it of items) if (it.preview) URL.revokeObjectURL(it.preview);
    };
    // Only on unmount: `items` is intentionally excluded so previews survive
    // re-renders; per-item URLs are revoked in remove().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Keep the hidden input's FileList matching the tray, so FormData sends it. */
  function sync(next: Picked[]) {
    const input = fileRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    for (const it of next) dt.items.add(it.file);
    input.files = dt.files;
  }

  /** The photo and file buttons share ONE input; they only differ in `accept`. */
  function openPicker(accept: string) {
    const input = fileRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
  }

  function onFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    if (chosen.length === 0) return;
    const next = [
      ...items,
      ...chosen.map((file) => {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        return {
          id: `a${idRef.current++}`,
          file,
          preview: isImage || isVideo ? URL.createObjectURL(file) : null,
          isVideo,
          isFile: !isImage && !isVideo,
        };
      }),
    ];
    setItems(next);
    sync(next);
  }

  function remove(id: string) {
    const gone = items.find((i) => i.id === id);
    if (gone?.preview) URL.revokeObjectURL(gone.preview);
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    sync(next);
  }

  function autoGrow() {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextH = Math.min(el.scrollHeight, MAX_COMPOSER_PX);
    el.style.height = `${nextH}px`;
    el.style.overflowY = el.scrollHeight > MAX_COMPOSER_PX ? "auto" : "hidden";
  }

  function insertEmoji(emoji: string) {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + emoji + el.value.slice(end);
    const caret = start + emoji.length;
    el.focus();
    el.setSelectionRange(caret, caret);
    autoGrow();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    // Conversation.tsx sends this and appends the bubble optimistically, so the
    // browser must not navigate.
    e.preventDefault();
    onSend(new FormData(e.currentTarget));
    // Safe to clear now: FormData above is already a snapshot.
    const el = textRef.current;
    if (el) {
      el.value = "";
      el.style.height = "auto";
      el.style.overflowY = "hidden";
    }
    for (const it of items) if (it.preview) URL.revokeObjectURL(it.preview);
    setItems([]);
    sync([]);
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5"
    >
      <input type="hidden" name="threadId" value={threadId} />
      {replyTo && <input type="hidden" name="replyToId" value={replyTo.id} />}
      {/* One hidden input for both attach buttons; accept is set per click. */}
      <input
        ref={fileRef}
        name="attachments"
        type="file"
        multiple
        onChange={onFilesChosen}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      {replyingAs && (
        <p className="mb-2 text-xs text-slate-500">
          Replying as{" "}
          <span className="font-medium text-slate-700">{replyingAs}</span>
        </p>
      )}

      {/* What you're replying to, with a way out of it. */}
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-brand-500 bg-slate-50 py-1.5 pl-2.5 pr-1.5">
          <div className="min-w-0 flex-1 text-[11.5px] leading-snug">
            <span className="font-semibold text-slate-700">
              Replying to {replyTo.author}
            </span>
            <span className="ml-1 line-clamp-1 text-slate-500">
              {replyTo.excerpt}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            title="Cancel reply"
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <X size={12} strokeWidth={3} aria-hidden />
          </button>
        </div>
      )}

      {/* Attachment tray: FIXED height, scrolls sideways. Never resizes the box. */}
      {items.length > 0 && (
        <ul className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {items.map((it) => (
            <li key={it.id} className="relative shrink-0">
              {it.isFile ? (
                <div className="flex h-14 w-40 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5">
                  <FileText size={20} className="shrink-0 text-brand-600" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-[11.5px] font-semibold text-slate-700">
                      {it.file.name}
                    </span>
                    <span className="block text-[10.5px] text-slate-500">
                      {formatBytes(it.file.size)}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {it.isVideo ? (
                    <video
                      src={it.preview ?? undefined}
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.preview ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(it.id)}
                aria-label={`Remove ${it.file.name}`}
                title="Remove"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white bg-slate-700 text-white shadow-sm hover:bg-slate-900"
              >
                <X size={11} strokeWidth={3} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Input row: fixed, only the textarea itself grows with typed lines. */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textRef}
          name="body"
          rows={1}
          onInput={() => {
            autoGrow();
            onTyping?.();
          }}
          onKeyDown={onKeyDown}
          placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
          className="max-h-36 flex-1 resize-none overflow-hidden rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Send
        </button>
      </div>

      {/* Action icons: Option A ghost buttons, each with a tooltip. */}
      <div className="mt-1.5 flex items-center gap-1">
        <IconButton
          label="Attach photo or video"
          onClick={() => openPicker(PHOTO_ACCEPT)}
        >
          <ImageIcon size={19} aria-hidden />
        </IconButton>
        <IconButton
          label="Attach a file"
          onClick={() => openPicker(FILE_ACCEPT)}
        >
          <Paperclip size={19} aria-hidden />
        </IconButton>
        <EmojiButton onPick={insertEmoji} />
      </div>
    </form>
  );
}
