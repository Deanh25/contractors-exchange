import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Acting-as identity (PRD company-as-actor). A user acts either as themselves or
 * as a company they may act for (role=owner OR canActAsCompany). The current
 * context is stored in an httpOnly cookie; the server always re-validates the
 * permission, so the cookie can't grant access on its own.
 */

const ACTING_COOKIE = "cx_acting";

export type ActingCompany = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: "owner" | "member";
  canActAsCompany: boolean;
};

export type ActingContext =
  | { type: "user" }
  | { type: "company"; company: ActingCompany };

/** Companies the user may act for, for the switcher and "act as" selectors. */
export async function getActingCompanies(
  userId: string | null | undefined,
): Promise<ActingCompany[]> {
  if (!userId) return [];
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      OR: [{ role: "owner" }, { canActAsCompany: true }],
    },
    include: { company: true },
    orderBy: { company: { name: "asc" } },
  });
  return memberships.map((m) => ({
    id: m.company.id,
    name: m.company.name,
    slug: m.company.slug,
    logoUrl: m.company.logoUrl,
    role: m.role,
    canActAsCompany: m.canActAsCompany,
  }));
}

/** May this user act as this company? (owner OR granted canActAsCompany) */
export async function canActAs(
  userId: string,
  companyId: string,
): Promise<boolean> {
  const m = await prisma.membership.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { role: true, canActAsCompany: true },
  });
  return !!m && (m.role === "owner" || m.canActAsCompany);
}

/** Is this user an owner of this company? (team management is owner-gated) */
export async function isCompanyOwner(
  userId: string,
  companyId: string,
): Promise<boolean> {
  const m = await prisma.membership.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { role: true },
  });
  return m?.role === "owner";
}

/**
 * Resolve the user's current acting context from the cookie, re-validating the
 * permission. Falls back to acting as the user when the cookie is missing,
 * stale, or no longer permitted.
 */
export async function getActingContext(
  userId: string | null | undefined,
): Promise<ActingContext> {
  if (!userId) return { type: "user" };
  const store = await cookies();
  const raw = store.get(ACTING_COOKIE)?.value ?? "";
  if (!raw.startsWith("company:")) return { type: "user" };
  const companyId = raw.slice("company:".length);
  if (!companyId) return { type: "user" };

  const m = await prisma.membership.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: { company: true },
  });
  if (!m || (m.role !== "owner" && !m.canActAsCompany)) return { type: "user" };
  return {
    type: "company",
    company: {
      id: m.company.id,
      name: m.company.name,
      slug: m.company.slug,
      logoUrl: m.company.logoUrl,
      role: m.role,
      canActAsCompany: m.canActAsCompany,
    },
  };
}

/** Set (or clear) the acting context cookie. Pass null to act as the user. */
export async function writeActingCookie(
  companyId: string | null,
): Promise<void> {
  const store = await cookies();
  if (companyId) {
    store.set(ACTING_COOKIE, `company:${companyId}`, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    store.delete(ACTING_COOKIE);
  }
}
