"use client";

import { useEffect, useRef } from "react";
import { sendMessageAction } from "@/app/actions/message";
import { MediaInput } from "@/components/MediaInput";

/**
 * Sticky conversation composer (messenger Round 1): Enter sends, Shift+Enter adds
 * a newline, the box grows with the text, and the thread auto-scrolls to the
 * newest message on load. Round 2 makes sending optimistic; today it posts the
 * server action and the page re-renders.
 */
/** Composer grows to this height, then scrolls internally. */
const MAX_COMPOSER_PX = 160;

export function Composer({
  threadId,
  replyingAs,
}: {
  threadId: string;
  /** Set when replying as a company, so the sender identity is obvious. */
  replyingAs?: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Land on the newest message, like every chat app.
  useEffect(() => {
    const el = document.getElementById("cx-thread-end");
    el?.scrollIntoView({ block: "end" });
  }, []);

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

  return (
    <form
      ref={formRef}
      action={sendMessageAction}
      onSubmit={() => {
        // Clear AFTER this event: React serializes the FormData synchronously
        // during submit, so wiping the textarea here would send an empty body
        // and the message would silently never be created.
        requestAnimationFrame(() => {
          const el = textRef.current;
          if (!el) return;
          el.value = "";
          el.style.height = "auto";
          el.style.overflowY = "hidden";
        });
      }}
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
          onInput={autoGrow}
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
