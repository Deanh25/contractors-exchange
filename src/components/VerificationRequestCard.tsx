import { requestVerificationAction } from "@/app/actions/verification";
import { DocumentUpload } from "@/components/DocumentUpload";
import type { VerificationRequest } from "@/generated/prisma/client";

/**
 * "Get verified" card (PRD §7C). Shown to an account that isn't verified yet: it
 * collects the legal business name, contractor license + state, business address,
 * and uploaded documents, then submits to the admin verification queue. Reflects
 * the current state (pending / denied with a reason / not started).
 */

function docs(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500";

export function VerificationRequestCard({
  verified,
  request,
  subjectLabel,
}: {
  verified: boolean;
  request: VerificationRequest | null;
  /** e.g. "your account" or the company name */
  subjectLabel: string;
}) {
  if (verified) {
    return (
      <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm font-semibold text-sky-800">✓ Verified</p>
        <p className="mt-1 text-sm text-sky-700">
          {subjectLabel} is verified. The badge shows across the marketplace.
        </p>
      </section>
    );
  }

  const pending = request?.status === "pending";
  const denied = request?.status === "denied";
  const attached = docs(request?.documents);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Get verified
        </h2>
        {pending && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Pending review
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-slate-500">
        Verification confirms a real business with a valid contractor license, and
        earns the verified badge. Provide your details and upload your license (and
        any registration or insurance docs).
      </p>

      {denied && request?.adminNote && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Your last request needs changes: {request.adminNote}
        </p>
      )}

      {pending ? (
        <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Submitted for review as{" "}
          <span className="font-medium text-slate-800">{request?.legalName}</span>{" "}
          (license {request?.licenseNumber}, {request?.licenseState}).{" "}
          {attached.length > 0
            ? `${attached.length} document${attached.length === 1 ? "" : "s"} attached.`
            : "No documents attached yet."}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-brand-700">
              Add documents / update details
            </summary>
            <Form request={request} />
          </details>
        </div>
      ) : (
        <Form request={request} />
      )}
    </section>
  );
}

function Form({ request }: { request: VerificationRequest | null }) {
  return (
    <form
      action={requestVerificationAction}
      encType="multipart/form-data"
      className="mt-3 space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Legal business name
        </label>
        <input
          name="legalName"
          required
          defaultValue={request?.legalName ?? ""}
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Contractor license #
          </label>
          <input
            name="licenseNumber"
            required
            defaultValue={request?.licenseNumber ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            License state
          </label>
          <input
            name="licenseState"
            required
            placeholder="e.g. NC"
            defaultValue={request?.licenseState ?? ""}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Business address
        </label>
        <input
          name="businessAddress"
          required
          defaultValue={request?.businessAddress ?? ""}
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Documents (license, registration, insurance)
        </label>
        <DocumentUpload existing={docs(request?.documents)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Note (optional)
        </label>
        <input name="note" defaultValue={request?.note ?? ""} className={inputCls} />
      </div>
      <button
        type="submit"
        className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Submit for verification
      </button>
    </form>
  );
}
