"use client";

import { useEffect } from "react";
import { markAllNotificationsReadAction } from "@/app/actions/notification";

/** Clears the unread notification badge once the /notifications page is viewed
 * (fires on mount only, not on link prefetch). */
export function MarkNotificationsRead({ hasUnread }: { hasUnread: boolean }) {
  useEffect(() => {
    if (hasUnread) markAllNotificationsReadAction().catch(() => {});
  }, [hasUnread]);
  return null;
}
