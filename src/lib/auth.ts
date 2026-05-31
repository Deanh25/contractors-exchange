import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import type { User } from "@/generated/prisma/client";

/** Current signed-in user, or null for guests (guest browsing is allowed). */
export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user;
}

/** Require a signed-in user; redirect to sign-in (preserving return path) if not. */
export async function requireUser(returnTo?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const qs = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/signin${qs}`);
  }
  return user;
}

/** Companies the user belongs to, with role, for nav/account surfaces. */
export async function getUserCompanies(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
}
