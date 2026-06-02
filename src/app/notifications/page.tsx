import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  return (
    <main className="flex-1">
      <WorkspaceShell user={user} active="notifications">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Deal requests, messages, reviews, and follows, all in one place.
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Notifications are coming soon. For now, check{" "}
          <Link href="/orders" className="font-semibold underline">
            Orders
          </Link>{" "}
          and{" "}
          <Link href="/messages" className="font-semibold underline">
            Messages
          </Link>{" "}
          for activity.
        </div>
      </WorkspaceShell>
    </main>
  );
}
