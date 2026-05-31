import Link from "next/link";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/me");

  const { error, email, next } = await searchParams;

  const message =
    error === "email"
      ? "Please enter a valid email address."
      : error === "name"
        ? "Looks like you're new here — please add your name to create your account."
        : null;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign in to Contractors Exchange
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Dev sign-in: enter your email to continue. New here? Add your name and
          we&apos;ll create your account — no password needed.
        </p>

        {message && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {message}
          </p>
        )}

        <form action={signInAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoFocus
              defaultValue={email ?? ""}
              placeholder="you@company.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name <span className="text-slate-400">(new accounts)</span>
            </label>
            <input
              name="name"
              type="text"
              placeholder="Jordan Rivera"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
