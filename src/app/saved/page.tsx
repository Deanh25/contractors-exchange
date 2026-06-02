import { requireUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export default async function SavedPage() {
  const user = await requireUser("/saved");
  return (
    <main className="flex-1">
      <WorkspaceShell user={user} active="saved">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Saved</h1>
        <p className="mt-1 text-sm text-slate-500">
          Save listings to come back to, organized into collections.
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Saving is coming soon. You&apos;ll be able to bookmark listings and group
          them into collections (like &quot;For the Charlotte job&quot;).
        </div>
      </WorkspaceShell>
    </main>
  );
}
