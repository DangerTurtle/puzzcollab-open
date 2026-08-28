import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";

const DATABASE_PATH = process.env.DATABASE_PATH || "app.db";

let _db: Kysely<DatabaseSchema> | null = null;

export const getDb = (): Kysely<DatabaseSchema> => {
  if (!_db) {
    const sqlite = new Database(DATABASE_PATH);
    sqlite.pragma("journal_mode = WAL");

    _db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: sqlite }),
    });
  }
  return _db;
};

export interface DatabaseSchema {
  auth_state: AuthStateTable;
  auth_session: AuthSessionTable;
  account: AccountTable;
  team: TeamTable;
  member: MemberTable;
  invite: InviteTable;
  session: SessionTable;
  attempt: AttemptTable;
  comment: CommentTable;
  puzzle: PuzzleTable;
}

interface AuthStateTable {
  key: string;
  value: string;
}

interface AuthSessionTable {
  key: string;
  value: string;
}

export interface AccountTable {
  did: string;
  handle: string;
  active: 0 | 1;
}

export interface TeamTable {
  uri: string;
  cid: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  indexedAt: string;
}

export interface MemberTable {
  uri: string;
  cid: string;
  team: string;
  memberDid: string;
  addedAt: string;
  invitedBy: string | null;
  indexedAt: string;
}

export interface InviteTable {
  uri: string;
  cid: string;
  session: string;
  joinPolicy: string;
  createdBy: string;
  createdAt: string;
  indexedAt: string;
}

export interface SessionTable {
  uri: string;
  cid: string;
  team: string;
  puzzle: string;
  createdBy: string | null;
  createdAt: string;
  indexedAt: string;
}

export interface AttemptTable {
  uri: string;
  cid: string;
  authorDid: string;
  session: string;
  clueId: string;
  text: string;
  createdAt: string;
  indexedAt: string;
}

export interface CommentTable {
  uri: string;
  cid: string;
  authorDid: string;
  session: string;
  clueId: string | null;
  text: string;
  createdAt: string;
  indexedAt: string;
}

export interface PuzzleTable {
  uri: string;
  cid: string;
  title: string;
  clues: string;
  createdAt: string;
  indexedAt: string;
}
