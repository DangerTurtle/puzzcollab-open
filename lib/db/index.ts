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
  attempt: AttemptTable;
  comment: CommentTable;
  puzzle: PuzzleTable;
  erratum: ErratumTable;
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
  creatorDid: string | null;
  createdAt: string;
  indexedAt: string;
}

export interface MemberTable {
  uri: string;
  cid: string;
  teamUri: string;
  memberDid: string;
  addedAt: string;
  invitedByUri: string | null;
  indexedAt: string;
}

export interface InviteTable {
  uri: string;
  cid: string;
  teamUri: string;
  joinPolicy: string;
  creatorDid: string;
  createdAt: string;
  indexedAt: string;
}

export interface AttemptTable {
  uri: string;
  cid: string;
  authorDid: string;
  puzzleUri: string;
  clueId: string;
  text: string;
  createdAt: string;
  indexedAt: string;
}

export interface CommentTable {
  uri: string;
  cid: string;
  authorDid: string;
  puzzleUri: string;
  clueId: string | null;
  text: string;
  createdAt: string;
  indexedAt: string;
}

export interface PuzzleTable {
  uri: string;
  cid: string;
  authorDid: string;
  title: string;
  body: string;
  cluesJson: string;
  createdAt: string;
  publishAt: string | null;
  indexedAt: string;
}

export interface ErratumTable {
  uri: string;
  cid: string;
  puzzleUri: string;
  authorDid: string;
  text: string;
  revisedBody: string | null;
  revisedCluesJson: string | null;
  createdAt: string;
  indexedAt: string;
}

export interface ErratumTable {
  uri: string;
  cid: string;
  puzzleUri: string;
  authorDid: string;
  text: string;
  revisedBody: string | null;
  revisedCluesJson: string | null;
  createdAt: string;
  indexedAt: string;
}
