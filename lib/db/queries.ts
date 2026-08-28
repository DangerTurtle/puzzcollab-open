import { getDb, AccountTable } from ".";
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
  // Deliberately not cascading into team/member/invite/session/attempt/comment
  // here yet -- what should happen to a member's history when their identity
  // goes away is a real product question, not a safe default to pick silently.
  // Revisit once the webhook's identity-event handling is built (step 3+).
}
