import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * Verification-request SERVICE (PRD §7C). Framework-agnostic: no FormData/redirect/
 * revalidate/cookies. Document persistence is the caller's concern (web saves the
 * uploaded Files and passes URLs; mobile uploads separately). Subject resolution
 * (which user/company, owner permission) is identity work done by the caller. See
 * docs/CX-build-checklist.md section E.
 */

function docsFromJson(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export type VerificationSubject = { type: "user" | "company"; id: string };

export type VerificationFields = {
  legalName: string;
  licenseNumber: string;
  licenseState: string;
  businessAddress: string;
  note: string | null;
};

export type SubmitVerificationResult =
  | { status: "ok" }
  | { status: "error"; code: "missing" };

/**
 * Submit (or update) a pending verification request for the subject. Merges the
 * kept existing documents with newly uploaded ones. Lands in the admin queue as
 * "pending".
 */
export async function submitVerificationRequest(
  subject: VerificationSubject,
  fields: VerificationFields,
  newDocUrls: string[],
  keepDocUrls: string[],
): Promise<SubmitVerificationResult> {
  const legalName = fields.legalName.trim();
  const licenseNumber = fields.licenseNumber.trim();
  const licenseState = fields.licenseState.trim();
  const businessAddress = fields.businessAddress.trim();
  if (!legalName || !licenseNumber || !licenseState || !businessAddress) {
    return { status: "error", code: "missing" };
  }

  const subjectWhere =
    subject.type === "company"
      ? { companyId: subject.id }
      : { userId: subject.id };
  const existing = await prisma.verificationRequest.findFirst({
    where: { ...subjectWhere, status: "pending" },
  });

  // Keep only the already-attached docs the submitter chose to keep (validated
  // against the request's real docs), then append the newly uploaded ones.
  const existingDocs = existing ? docsFromJson(existing.documents) : [];
  const kept = existingDocs.filter((u) => keepDocUrls.includes(u));
  const docs = [...kept, ...newDocUrls];
  const data = {
    legalName,
    licenseNumber,
    licenseState,
    businessAddress,
    note: fields.note,
    documents: docs.length > 0 ? docs : Prisma.JsonNull,
  };

  if (existing) {
    await prisma.verificationRequest.update({ where: { id: existing.id }, data });
  } else {
    await prisma.verificationRequest.create({ data: { ...subjectWhere, ...data } });
  }
  return { status: "ok" };
}
