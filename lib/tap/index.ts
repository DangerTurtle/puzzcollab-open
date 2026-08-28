import { Tap } from "@atproto/tap";

const TAP_URL = process.env.TAP_URL || "http://localhost:2480";
const TAP_ADMIN_PASSWORD = process.env.TAP_ADMIN_PASSWORD;

let _tap: Tap | null = null;

export const getTap = (): Tap => {
  if (!_tap) {
    _tap = new Tap(TAP_URL, { adminPassword: TAP_ADMIN_PASSWORD });
  }
  return _tap;
};

// We track repos individually (call this once a DID becomes relevant to us --
// e.g. joining a team) rather than using Tap's collection-signal auto-discovery,
// so Tap never backfills accounts with no real relationship to puzzling.us.
// Tap's own /repos/add already batches (accepts an array), so registering many
// members at once, or one at a time as they join, are both cheap.
export const registerRepos = (dids: string[]): Promise<void> =>
  getTap().addRepos(dids);
