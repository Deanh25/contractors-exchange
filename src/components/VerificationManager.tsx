"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import {
  setUserVerifiedAction,
  setCompanyVerifiedAction,
} from "@/app/actions/admin-trust";

/**
 * Verification manager (PRD §7C, Module 3). Search + filter accounts by status
 * (pending / verified / new) and kind (users / companies), and grant OR revoke
 * the verified badge. Mirrors the Margins module's controls.
 */

export type Account = {
  id: string;
  kind: "user" | "company";
  name: string;
  avatar: string | null;
  sub: string;
  href: string;
  verified: boolean;
  isNew: boolean;
  joined: string;
};

type Status = "all" | "pending" | "verified" | "new";
type Kind = "all" | "user" | "company";

export function VerificationManager({ accounts }: { accounts: Account[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("pending");
  const [kind, setKind] = useState<Kind>("all");

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      accounts.filter((a) => {
        if (q && !a.name.toLowerCase().includes(q) && !a.sub.toLowerCase().includes(q))
          return false;
        if (kind !== "all" && a.kind !== kind) return false;
        if (status === "pending" && a.verified) return false;
        if (status === "verified" && !a.verified) return false;
        if (status === "new" && !a.isNew) return false;
        return true;
      }),
    [accounts, q, status, kind],
  );

  const counts = useMemo(
    () => ({
      pending: accounts.filter((a) => !a.verified).length,
      verified: accounts.filter((a) => a.verified).length,
      new: accounts.filter((a) => a.isNew).length,
    }),
    [accounts],
  );

  return (
    <div>
      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <Segmented
          value={kind}
          onChange={(v) => setKind(v as Kind)}
          options={[
            ["all", "All"],
            ["company", "Companies"],
            ["user", "Users"],
          ]}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Tab active={status === "pending"} onClick={() => setStatus("pending")}>
          Pending ({counts.pending})
        </Tab>
        <Tab active={status === "verified"} onClick={() => setStatus("verified")}>
          Verified ({counts.verified})
        </Tab>
        <Tab active={status === "new"} onClick={() => setStatus("new")}>
          New ({counts.new})
        </Tab>
        <Tab active={status === "all"} onClick={() => setStatus("all")}>
          All ({accounts.length})
        </Tab>
      </div>

      {/* List */}
      <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            No accounts match.
          </p>
        ) : (
          shown.map((a) => <Row key={`${a.kind}-${a.id}`} a={a} />)
        )}
      </div>
    </div>
  );
}

function Row({ a }: { a: Account }) {
  const action = a.kind === "company" ? setCompanyVerifiedAction : setUserVerifiedAction;
  const idField = a.kind === "company" ? "companyId" : "userId";
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar name={a.name} src={a.avatar} size={36} rounded={a.kind === "company" ? "md" : "full"} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={a.href} className="truncate font-medium text-slate-900 hover:underline">
            {a.name}
          </Link>
          {a.verified && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
              Verified
            </span>
          )}
          {a.isNew && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              New
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-500">
          {a.kind === "company" ? "Company" : "User"} · {a.sub} · joined {a.joined}
        </p>
      </div>
      <form action={action}>
        <input type="hidden" name={idField} value={a.id} />
        <input type="hidden" name="value" value={a.verified ? "0" : "1"} />
        {a.verified ? (
          <button
            type="submit"
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Remove badge
          </button>
        ) : (
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            ✓ Verify
          </button>
        )}
      </form>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-medium ${
        active ? "bg-brand-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-slate-300">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-2 text-sm font-medium ${
            value === v ? "bg-brand-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
