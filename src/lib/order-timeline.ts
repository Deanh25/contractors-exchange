import type {
  TransactionType,
  TransactionStatus,
} from "@/generated/prisma/client";

/**
 * Order timeline model: the FULL buying/selling journey for a deal, past and
 * future, so both sides can see where they are and what is still ahead.
 *
 * Pure and framework-agnostic (no Prisma client, no React, no next/*) so the
 * Expo app can render the same tracker from the same steps. The web renderer is
 * `src/components/OrderTimeline.tsx`.
 */

export type OrderStepState =
  /** Reached and behind us. */
  | "done"
  /** Where the deal sits right now. */
  | "current"
  /** Still ahead on a live deal. */
  | "upcoming"
  /** The deal ended here (declined / cancelled). */
  | "stopped"
  /** Never happened, because the deal stopped early. */
  | "skipped";

export type OrderStep = {
  key: string;
  label: string;
  /** Short caption under the marker: what happens here, or whose move it is. */
  hint: string | null;
  state: OrderStepState;
  /** When the step was reached; null for steps with no recorded moment. */
  at: Date | null;
};

export type OrderTimelineInput = {
  type: TransactionType;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date | null;
  completedAt?: Date | null;
  closedAt?: Date | null;
  /** Flips the "whose move is it" hints. */
  viewerIsBuyer: boolean;
  /** When the viewer left their review, if they have. */
  reviewedAt?: Date | null;
};

type TrackStep = { key: string; label: string; hint?: string };

/**
 * Each deal type runs a different course. Trades carry no escrow, so they have
 * no Payment step and the parties settle directly.
 */
const TRACKS: Record<TransactionType, TrackStep[]> = {
  purchase: [
    { key: "requested", label: "Requested" },
    { key: "accepted", label: "Accepted" },
    { key: "payment", label: "Payment", hint: "Escrow, stubbed in v1" },
    { key: "handoff", label: "Handoff", hint: "Ship or pick up" },
    { key: "completed", label: "Completed" },
    { key: "review", label: "Review" },
  ],
  bid: [
    { key: "requested", label: "Bid placed" },
    { key: "accepted", label: "Awarded" },
    { key: "payment", label: "Payment", hint: "Escrow, stubbed in v1" },
    { key: "handoff", label: "Handoff", hint: "Ship or pick up" },
    { key: "completed", label: "Completed" },
    { key: "review", label: "Review" },
  ],
  trade_request: [
    { key: "requested", label: "Requested" },
    { key: "accepted", label: "Accepted" },
    { key: "handoff", label: "Exchange", hint: "Arrange directly, no escrow" },
    { key: "completed", label: "Completed" },
    { key: "review", label: "Review" },
  ],
};

/** Whose move it is at the step the deal is sitting on. */
function currentHint(key: string, isBuyer: boolean): string | null {
  switch (key) {
    case "accepted":
      return isBuyer ? "Waiting on the seller" : "Your move: accept or decline";
    case "payment":
      return "Escrow, stubbed in v1";
    case "handoff":
      return "Mark completed when the exchange is done";
    case "review":
      return "Rate your deal";
    default:
      return null;
  }
}

/** The terminal marker that replaces the rest of the track on a dead deal. */
function stoppedStep(
  status: "declined" | "cancelled",
  isBuyer: boolean,
  at: Date,
): OrderStep {
  return status === "declined"
    ? {
        key: "declined",
        label: "Declined",
        hint: isBuyer ? "The seller declined" : "You declined",
        state: "stopped",
        at,
      }
    : {
        key: "cancelled",
        label: "Cancelled",
        hint: isBuyer ? "You cancelled" : "The buyer cancelled",
        state: "stopped",
        at,
      };
}

/**
 * Build the ordered steps for a deal. Every step of the course is returned,
 * including ones still ahead, so the renderer can draw the whole path.
 */
export function orderTimeline(input: OrderTimelineInput): OrderStep[] {
  const track = TRACKS[input.type];
  const { status, viewerIsBuyer: isBuyer } = input;

  // Rows predating the per-milestone stamps fall back to updatedAt, which at
  // least holds the moment of the LAST transition.
  const acceptedAt = input.acceptedAt ?? input.updatedAt;
  const completedAt = input.completedAt ?? input.updatedAt;
  const closedAt = input.closedAt ?? input.updatedAt;

  // A dead deal keeps its first step, shows why it ended in the second slot,
  // and greys out everything that never got to happen.
  if (status === "declined" || status === "cancelled") {
    return [
      {
        key: track[0].key,
        label: track[0].label,
        hint: null,
        state: "done",
        at: input.createdAt,
      },
      // The terminal marker takes the slot the deal died in (Accepted), so the
      // greyed tail is only the steps that genuinely never happened.
      stoppedStep(status, isBuyer, closedAt),
      ...track.slice(2).map((s) => ({
        key: s.key,
        label: s.label,
        hint: null,
        state: "skipped" as const,
        at: null,
      })),
    ];
  }

  // How far a live deal has actually travelled. Payment and Handoff have no
  // real transition yet (v1 stubs escrow), so completing a deal carries them
  // both; they read as done without a timestamp of their own.
  const reviewed = input.reviewedAt != null;
  const lastDone =
    status === "completed"
      ? track.findIndex((s) => s.key === "completed") + (reviewed ? 1 : 0)
      : status === "accepted"
        ? track.findIndex((s) => s.key === "accepted")
        : 0;

  const at = (key: string): Date | null => {
    if (key === track[0].key) return input.createdAt;
    if (key === "accepted") return acceptedAt;
    if (key === "completed") return completedAt;
    if (key === "review") return input.reviewedAt ?? null;
    return null; // payment / handoff carry no recorded moment in v1
  };

  return track.map((s, i) => ({
    key: s.key,
    label: s.label,
    hint:
      i === lastDone + 1 ? currentHint(s.key, isBuyer) : (s.hint ?? null),
    state: i <= lastDone ? "done" : i === lastDone + 1 ? "current" : "upcoming",
    at: i <= lastDone ? at(s.key) : null,
  }));
}
