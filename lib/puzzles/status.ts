// Pure, shared between the server action (lib/puzzles/status.ts has no "use
// server"/"use client" of its own) and the client form -- the lexicon only
// has a single optional `publishAt` datetime, so "draft" is represented as a
// concrete far-future sentinel rather than a real tri-state field.
export type PuzzleStatus = "draft" | "published" | "scheduled";

export const DRAFT_PUBLISH_AT = "3000-01-01T00:00:00.000Z";

export function defaultScheduledAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

export function statusFromPublishAt(
  publishAt: string | null | undefined,
): PuzzleStatus {
  if (!publishAt) return "published";
  if (publishAt === DRAFT_PUBLISH_AT) return "draft";
  return "scheduled";
}

/** Returns the publishAt to store, or null to omit the field entirely. */
export function publishAtFromStatus(
  status: PuzzleStatus,
  scheduledAt: string | null,
): string | null {
  if (status === "draft") return DRAFT_PUBLISH_AT;
  if (status === "published") return null;
  return scheduledAt;
}
