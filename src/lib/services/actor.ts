import type { Party } from "@/lib/messaging";

/**
 * The resolved identity making a service call. Framework-agnostic on purpose:
 * the caller builds it from its own transport (cookies on web via
 * `resolveActor()`, a bearer token on mobile later) and hands it to a service.
 * Services never read cookies/headers themselves. See docs/CX-build-checklist.md
 * section E.
 */
export type Actor = {
  userId: string;
  userName: string;
  /** The party the user is acting as (self or a company they may act for). */
  party: Party;
  /** Ids of every company the user may act for (for controlsParty checks). */
  actingCompanyIds: Set<string>;
};
