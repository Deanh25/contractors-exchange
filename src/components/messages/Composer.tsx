"use client";

import { useEffect, useRef } from "react";
import { MediaInput } from "@/components/MediaInput";

/**
 * Sticky conversation composer: Enter sends, Shift+Enter adds a newline, and the
 * box grows with the text. Round 2 made sending optimistic, so this component
 * only collects input and hands the FormData up; the live conversation
 * (Conversation.tsx) owns the send, the message list, and scrolling.
 */
/** Composer grows to this height, then scrolls internally. */
const MAX_COMPOSER_PX = 160;

export function Composer({
  threadId,
  replyingAs,
  onSend,
  onTyping,
  autoFocus = false,
}: {
  threadId: string;
  /** Set when replying as a company, so the sender identity is obvious. */
  replyingAs?: string | null;
  onSend: (formData: FormData) => void | Promise<void>;
  /** Throttled upstream; called as the user types so the other side sees it. */
  onTyping?: () => void;
  /** True after a send remounts this composer, to keep the caret in the box. */
  autoFocus?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  /**
   * Facebook/LinkedIn-style composer: the box grows with the text and shows NO
   * scrollbar, only scrolling internally once it hits the max height.
   */
  function autoGrow() {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_COMPOSER_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_COMPOSER_PX ? "auto" : "hidden";
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    // The conversation sends this itself and appends the bubble optimistically,
    // so the browser must not navigate.
    e.preventDefault();
    const form = e.currentTarget;
    onSend(new FormData(form));
    // Safe to clear immediately: FormData above is already a snapshot.
    const el = textRef.current;
    if (el) {
      el.value = "";
      el.style.height = "auto";
      el.style.overflowY = "hidden";
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5"
    >
      <input type="hidden" name="threadId" value={threadId} />
      {replyingAs && (
        <p className="mb-2 text-xs text-slate-500">
          Replying as{" "}
          <span className="font-medium text-slate-700">{replyingAs}</span>
        </p>
      )}
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
          className="max-h-40 flex-1 resize-none overflow-hidden rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <MediaInput name="image" label="📷" />
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Send
        </button>
      </div>
    </form>
  );
}
