"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  sendChatMessageAction,
  markThreadReadAction,
  type SerializedChatMessage,
} from "@/app/actions/message";
import {
  groupThreadMessages,
  chatMessageIsOwn,
  type ChatMessage,
  type ChatParty,
} from "@/lib/chat";
import { MessageList } from "@/components/messages/MessageList";
import { Composer } from "@/components/messages/Composer";

/**
 * The LIVE conversation (messenger Round 2). Owns the message list so it can:
 *  - poll for new messages, the other side's read cursor, and their typing state
 *  - show your own message the instant you hit send (optimistic), then swap in
 *    the saved row
 *  - keep the surrounding server components (thread list, deal panel, unread
 *    badge) honest by refreshing them when something actually arrives
 *
 * Grouping is the same pure model the server renders with (src/lib/chat.ts), so
 * a polled message groups exactly as it would have on a full page load.
 */

/** How often to poll while the tab is visible. */
const POLL_MS = 4000;
/** Treat the reader as "at the bottom" within this many px (don't yank them). */
const NEAR_BOTTOM_PX = 120;

function reviveMessage(m: SerializedChatMessage): ChatMessage {
  return { ...m, createdAt: new Date(m.createdAt) };
}

export function Conversation({
  threadId,
  myParty,
  initialMessages,
  initialOtherLastReadAt,
  replyingAs,
}: {
  threadId: string;
  myParty: ChatParty;
  initialMessages: SerializedChatMessage[];
  initialOtherLastReadAt: string | null;
  replyingAs: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages.map(reviveMessage),
  );
  const [otherLastReadAt, setOtherLastReadAt] = useState<Date | null>(
    initialOtherLastReadAt ? new Date(initialOtherLastReadAt) : null,
  );
  const [otherTyping, setOtherTyping] = useState(false);
  /** Remounts the media picker after a send, clearing its preview. */
  const [composerKey, setComposerKey] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  /**
   * Poll cursor: the server's clock from the last response, seeded from what
   * the server already rendered so the first poll asks only for what came after.
   */
  const sinceRef = useRef<string | null>(
    initialMessages.length > 0
      ? initialMessages[initialMessages.length - 1].createdAt
      : new Date().toISOString(),
  );
  /**
   * Is the reader pinned to the bottom? Tracked on scroll rather than measured
   * after new content lands, because appending changes scrollHeight without
   * firing a scroll event, and we want the position from BEFORE the append.
   */
  const wasAtBottomRef = useRef(true);
  const tempIdRef = useRef(0);
  /** Read inside the poll loop, which must not restart when props re-render. */
  const myPartyRef = useRef(myParty);
  useEffect(() => {
    myPartyRef.current = myParty;
  }, [myParty.type, myParty.id, myParty]);

  const atBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return (
      el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX
    );
  }, []);

  const scrollToEnd = useCallback((smooth: boolean) => {
    endRef.current?.scrollIntoView({
      block: "end",
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  /** Merge rows in by id: polling and the send response can both deliver one. */
  const mergeMessages = useCallback(
    (incoming: ChatMessage[], dropTempId?: string) => {
      if (incoming.length === 0 && !dropTempId) return;
      setMessages((prev) => {
        const next = dropTempId
          ? prev.filter((m) => m.id !== dropTempId)
          : [...prev];
        const seen = new Set(next.map((m) => m.id));
        for (const m of incoming) {
          if (!seen.has(m.id)) {
            next.push(m);
            seen.add(m.id);
          }
        }
        next.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
        return next;
      });
    },
    [],
  );

  // --- polling -------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (cancelled || document.hidden) return schedule();
      try {
        const qs = sinceRef.current
          ? `?since=${encodeURIComponent(sinceRef.current)}`
          : "";
        const res = await fetch(`/api/messages/${threadId}/updates${qs}`, {
          cache: "no-store",
        });
        if (!res.ok) return schedule();
        const data: {
          messages: SerializedChatMessage[];
          otherLastReadAt: string | null;
          otherTyping: boolean;
          now: string;
        } = await res.json();
        if (cancelled) return;

        sinceRef.current = data.now;
        setOtherTyping(data.otherTyping);
        setOtherLastReadAt(
          data.otherLastReadAt ? new Date(data.otherLastReadAt) : null,
        );

        if (data.messages.length > 0) {
          const revived = data.messages.map(reviveMessage);
          mergeMessages(revived);
          // Anything from the other side means this thread is being read right
          // now, and that the deal panel / thread list may be stale.
          const inbound = revived.some(
            (m) => !chatMessageIsOwn(m, myPartyRef.current),
          );
          if (inbound) {
            markThreadReadAction(threadId).catch(() => {});
            router.refresh();
          }
        }
      } catch {
        // A dropped poll is not worth surfacing; the next one recovers.
      }
      schedule();
    }

    function schedule() {
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }

    // Coming back to the tab should feel instant, not up to POLL_MS stale.
    function onVisible() {
      if (!document.hidden) {
        clearTimeout(timer);
        poll();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // Every dependency here is stable, so the poll loop is set up ONCE. It must
    // not tear down and restart on each router.refresh(), which re-renders this
    // component with fresh props. The component is keyed by thread id, so a
    // different conversation gets a fresh instance anyway.
  }, [threadId, mergeMessages, router]);

  // --- scrolling -----------------------------------------------------------
  // Land on the newest message when the thread opens.
  useEffect(() => {
    scrollToEnd(false);
  }, [threadId, scrollToEnd]);

  // Follow new content only if the reader hadn't scrolled up to read history.
  useEffect(() => {
    if (wasAtBottomRef.current) scrollToEnd(true);
  }, [messages, otherTyping, scrollToEnd]);

  // --- typing --------------------------------------------------------------
  const lastTypingPing = useRef(0);
  const onTyping = useCallback(() => {
    const now = Date.now();
    // The stamp lives ~6s server-side, so a ping every 3s keeps it alive
    // without writing on every keystroke.
    if (now - lastTypingPing.current < 3000) return;
    lastTypingPing.current = now;
    fetch(`/api/messages/${threadId}/typing`, { method: "POST" }).catch(
      () => {},
    );
  }, [threadId]);

  // --- sending -------------------------------------------------------------
  const onSend = useCallback(
    async (formData: FormData) => {
      const body = String(formData.get("body") ?? "").trim();
      const file = formData.get("image");
      const hasFile = file instanceof File && file.size > 0;
      if (!body && !hasFile) return;

      // Show it immediately, with a local preview for any attachment.
      const tempId = `tmp-${tempIdRef.current++}`;
      const previewUrl = hasFile ? URL.createObjectURL(file) : null;
      const optimistic: ChatMessage = {
        id: tempId,
        kind: "user",
        body,
        imageUrl: previewUrl,
        createdAt: new Date(),
        senderUserId: myParty.type === "user" ? myParty.id : "",
        senderCompanyId: myParty.type === "company" ? myParty.id : null,
        senderUser: { id: "", name: "", avatarUrl: null },
        senderCompany: null,
        pending: "sending",
      };
      wasAtBottomRef.current = true;
      setMessages((prev) => [...prev, optimistic]);
      setComposerKey((k) => k + 1);

      try {
        const r = await sendChatMessageAction(formData);
        if (r.status === "sent") {
          mergeMessages([reviveMessage(r.message)], tempId);
          // The send moved the thread up the inbox and may have changed the
          // deal panel; refresh the server components around us.
          router.refresh();
        } else {
          markFailed(tempId);
        }
      } catch {
        markFailed(tempId);
      } finally {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      }

      function markFailed(id: string) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, pending: "failed" } : m)),
        );
      }
    },
    [myParty, mergeMessages, router],
  );

  const items = groupThreadMessages(messages, myParty);

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={() => {
          wasAtBottomRef.current = atBottom();
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <MessageList
          items={items}
          otherLastReadAt={otherLastReadAt}
          typing={otherTyping}
        />
        <div ref={endRef} />
      </div>
      {/* Remounted after each send so the media picker clears its preview. */}
      <Composer
        key={composerKey}
        threadId={threadId}
        replyingAs={replyingAs}
        onSend={onSend}
        onTyping={onTyping}
        autoFocus={composerKey > 0}
      />
    </>
  );
}
