"use client";

import { useEffect } from "react";
import { markThreadReadAction } from "@/app/actions/message";

/** Marks a thread read for the viewer on mount (only fires on real navigation,
 * not on link prefetch, so unread state stays accurate). */
export function MarkThreadRead({ threadId }: { threadId: string }) {
  useEffect(() => {
    markThreadReadAction(threadId).catch(() => {});
  }, [threadId]);
  return null;
}
