import { Client } from "@atproto/lex";
import type { OAuthSession } from "@atproto/oauth-client-node";

// Our OAuth client is confidential (private_key_jwt): sessions are restored
// server-side from auth_session (see lib/auth/session.ts), never handed to
// the browser. So every record read/write against a user's own PDS happens
// here, server-side, using their restored session as the request agent --
// OAuthSession's did + fetchHandler already satisfy @atproto/lex's Agent
// shape, no separate auth wiring needed.
export function getAtpClient(session: OAuthSession): Client {
  return new Client(session);
}
