import Link from "next/link";
import { redirect } from "next/navigation";
import { signInAction, signUpAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    email?: string;
    name?: string;
    next?: string;
    mode?: string;
  }>;
}) {
  const { error, email, name, next, mode } = await searchParams;
  const isSignup = mode === "signup";

  const user = await getCurrentUser();
  // A signed-in user normally skips sign-in - except when bounced here for lacking
  // admin access (show the form so they can switch accounts).
  if (user && error !== "forbidden") redirect("/me");

  const message =
    error === "credentials"
      ? "That email and password don't match. Try again."
      : error === "suspended"
        ? "This account has been suspended. Contact support."
        : error === "email"
          ? "Please enter a valid email address."
          : error === "name"
            ? "Please add your name to create your account."
            : error === "weak"
              ? `Password too short - use at least ${MIN_PASSWORD_LENGTH} characters.`
              : error === "taken"
                ? "An account with that email already exists. Sign in instead."
                : error === "forbidden"
                  ? "That account doesn't have admin access. Sign in with an admin account to continue."
                  : null;

  const nextField = next ?? "";

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isSignup ? "Create your account" : "Sign in to Contractors Exchange"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isSignup
            ? "Join the network for contractors: buy, bid, trade, and connect."
            : "Welcome back. Enter your email and password to continue."}
        </p>

        {message && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {message}
          </p>
        )}

        {isSignup ? (
          <form action={signUpAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={nextField} />
            <Field label="Name">
              <input
                name="name"
                type="text"
                required
                autoFocus
                defaultValue={name ?? ""}
                placeholder="Jordan Rivera"
                className={inputCls}
              />
            </Field>
            <Field label="Email">
              <input
                name="email"
                type="email"
                required
                defaultValue={email ?? ""}
                placeholder="you@company.com"
                className={inputCls}
              />
            </Field>
            <Field label="Password" hint={`at least ${MIN_PASSWORD_LENGTH} characters`}>
              <input
                name="password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                placeholder="Create a password"
                className={inputCls}
              />
            </Field>
            <button
              type="submit"
              className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Create account
            </button>
          </form>
        ) : (
          <form action={signInAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={nextField} />
            <Field label="Email">
              <input
                name="email"
                type="email"
                required
                autoFocus
                defaultValue={email ?? ""}
                placeholder="you@company.com"
                className={inputCls}
              />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Your password"
                className={inputCls}
              />
            </Field>
            <button
              type="submit"
              className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Sign in
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link
                href={buildHref("/signin", { next: nextField, email })}
                className="font-semibold text-brand-700 hover:underline"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to CX?{" "}
              <Link
                href={buildHref("/signin", { mode: "signup", next: nextField, email })}
                className="font-semibold text-brand-700 hover:underline"
              >
                Create an account
              </Link>
            </>
          )}
        </p>

        <p className="mt-4 text-center text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            &larr; Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {hint && <span className="ml-1 font-normal text-slate-400">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

/** Build a /signin href, dropping empty params. */
function buildHref(
  path: string,
  params: Record<string, string | undefined>,
): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v);
  const qs = usp.toString();
  return qs ? `${path}?${qs}` : path;
}
