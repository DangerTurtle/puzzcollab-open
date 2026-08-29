import {
  getDb,
  AccountTable,
  TeamTable,
  MemberTable,
  InviteTable,
  AttemptTable,
  CommentTable,
  PuzzleTable,
  ErratumTable,
} from ".";
import { getHandle } from "@atproto/common-web";
import { getTap } from "@/lib/tap";

export async function getAccountHandle(did: string): Promise<string | null> {
  const db = getDb();
  // if we've tracked to the account through Tap and gotten their account info, we'll load from there
  const account = await db
    .selectFrom("account")
    .select("handle")
    .where("did", "=", did)
    .executeTakeFirst();
  if (account) return account.handle;
  // otherwise we'll resolve the accounts DID through Tap which provides identity caching
  try {
    const didDoc = await getTap().resolveDid(did);
    if (!didDoc) return null;
    return getHandle(didDoc) ?? null;
  } catch {
    return null;
  }
}

export async function upsertAccount(data: AccountTable) {
  await getDb()
    .insertInto("account")
    .values(data)
    .onConflict((oc) =>
      oc.column("did").doUpdateSet({
        handle: data.handle,
        active: data.active,
      }),
    )
    .execute();
}

export async function deleteAccount(did: string) {
  await getDb().deleteFrom("account").where("did", "=", did).execute();
  // Deliberately not cascading into team/member/invite/attempt/comment
  // here yet -- what should happen to a member's history when their identity
  // goes away is a real product question, not a safe default to pick silently.
  // Revisit once the webhook's identity-event handling is built (step 3+).
}

// The webhook calls these on every create/update/delete event Tap delivers.
// Each upsert matches Tap's own semantics: "create" and "update" are handled
// identically (last write wins on uri), since the network doesn't guarantee
// we see a clean create-then-update sequence -- backfill and live events can
// interleave. No table declares foreign keys (see migrations.ts) since Tap
// can deliver, say, an attempt before the puzzle it references.

export async function upsertTeam(data: TeamTable) {
  await getDb()
    .insertInto("team")
    .values(data)
    .onConflict((oc) => oc.column("uri").doUpdateSet(data))
    .execute();
}

export async function deleteTeam(uri: string) {
  await getDb().deleteFrom("team").where("uri", "=", uri).execute();
}

export async function upsertMember(data: MemberTable) {
  await getDb()
    .insertInto("member")
    .values(data)
    .onConflict((oc) => oc.column("uri").doUpdateSet(data))
    .execute();
}

export async function deleteMember(uri: string) {
  await getDb().deleteFrom("member").where("uri", "=", uri).execute();
}

export async function upsertInvite(data: InviteTable) {
  await getDb()
    .insertInto("invite")
    .values(data)
    .onConflict((oc) => oc.column("uri").doUpdateSet(data))
    .execute();
}

export async function deleteInvite(uri: string) {
  await getDb().deleteFrom("invite").where("uri", "=", uri).execute();
}

export async function upsertAttempt(data: AttemptTable) {
  await getDb()
    .insertInto("attempt")
    .values(data)
    .onConflict((oc) => oc.column("uri").doUpdateSet(data))
    .execute();
}

export async function deleteAttempt(uri: string) {
  await getDb().deleteFrom("attempt").where("uri", "=", uri).execute();
}

export async function upsertComment(data: CommentTable) {
  await getDb()
    .insertInto("comment")
    .values(data)
    .onConflict((oc) => oc.column("uri").doUpdateSet(data))
    .execute();
}

export async function deleteComment(uri: string) {
  await getDb().deleteFrom("comment").where("uri", "=", uri).execute();
}

export async function upsertPuzzle(data: PuzzleTable) {
  await getDb()
    .insertInto("puzzle")
    .values(data)
    .onConflict((oc) => oc.column("uri").doUpdateSet(data))
    .execute();
}

export async function deletePuzzle(uri: string) {
  await getDb().deleteFrom("puzzle").where("uri", "=", uri).execute();
}

export async function upsertErratum(data: ErratumTable) {
  await getDb()
    .insertInto("erratum")
    .values(data)
    .onConflict((oc) => oc.column("uri").doUpdateSet(data))
    .execute();
}

export async function deleteErratum(uri: string) {
  await getDb().deleteFrom("erratum").where("uri", "=", uri).execute();
}
