/**
 * Temporary placeholder for admin modules not yet built. Each stub route still
 * gates on its real capability, so role-gating is testable now; the body is
 * replaced as each module lands.
 */
export function AdminPlaceholder({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{blurb}</p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Coming next in this build.
      </div>
    </div>
  );
}
