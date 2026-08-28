import { Kysely } from "kysely";
import { Migrator } from "kysely/migration";
import type { Migration } from "kysely/migration";
import { getDb } from ".";

const migrations: Record<string, Migration> = {
  "001": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("auth_state")
        .addColumn("key", "text", (col) => col.primaryKey())
        .addColumn("value", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("auth_session")
        .addColumn("key", "text", (col) => col.primaryKey())
        .addColumn("value", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("account")
        .addColumn("did", "text", (col) => col.primaryKey())
        .addColumn("handle", "text", (col) => col.notNull())
        .addColumn("active", "integer", (col) => col.notNull().defaultTo(1))
        .execute();

      await db.schema
        .createTable("team")
        .addColumn("uri", "text", (col) => col.primaryKey())
        .addColumn("cid", "text", (col) => col.notNull())
        .addColumn("name", "text", (col) => col.notNull())
        .addColumn("description", "text")
        .addColumn("creatorDid", "text")
        .addColumn("createdAt", "text", (col) => col.notNull())
        .addColumn("indexedAt", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("member")
        .addColumn("uri", "text", (col) => col.primaryKey())
        .addColumn("cid", "text", (col) => col.notNull())
        .addColumn("teamUri", "text", (col) => col.notNull())
        .addColumn("memberDid", "text", (col) => col.notNull())
        .addColumn("addedAt", "text", (col) => col.notNull())
        .addColumn("invitedByUri", "text")
        .addColumn("indexedAt", "text", (col) => col.notNull())
        .execute();
      await db.schema
        .createIndex("member_team_idx")
        .on("member")
        .columns(["teamUri", "memberDid"])
        .execute();
      await db.schema
        .createIndex("member_memberDid_idx")
        .on("member")
        .column("memberDid")
        .execute();

      await db.schema
        .createTable("invite")
        .addColumn("uri", "text", (col) => col.primaryKey())
        .addColumn("cid", "text", (col) => col.notNull())
        .addColumn("sessionUri", "text", (col) => col.notNull())
        .addColumn("joinPolicy", "text", (col) => col.notNull())
        .addColumn("creatorDid", "text", (col) => col.notNull())
        .addColumn("createdAt", "text", (col) => col.notNull())
        .addColumn("indexedAt", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("session")
        .addColumn("uri", "text", (col) => col.primaryKey())
        .addColumn("cid", "text", (col) => col.notNull())
        .addColumn("teamUri", "text", (col) => col.notNull())
        .addColumn("puzzleUri", "text", (col) => col.notNull())
        .addColumn("creatorDid", "text")
        .addColumn("createdAt", "text", (col) => col.notNull())
        .addColumn("indexedAt", "text", (col) => col.notNull())
        .execute();
      await db.schema
        .createIndex("session_team_idx")
        .on("session")
        .column("teamUri")
        .execute();

      await db.schema
        .createTable("attempt")
        .addColumn("uri", "text", (col) => col.primaryKey())
        .addColumn("cid", "text", (col) => col.notNull())
        .addColumn("authorDid", "text", (col) => col.notNull())
        .addColumn("sessionUri", "text", (col) => col.notNull())
        .addColumn("clueId", "text", (col) => col.notNull())
        .addColumn("text", "text", (col) => col.notNull())
        .addColumn("createdAt", "text", (col) => col.notNull())
        .addColumn("indexedAt", "text", (col) => col.notNull())
        .execute();
      await db.schema
        .createIndex("attempt_session_clue_idx")
        .on("attempt")
        .columns(["sessionUri", "clueId"])
        .execute();

      await db.schema
        .createTable("comment")
        .addColumn("uri", "text", (col) => col.primaryKey())
        .addColumn("cid", "text", (col) => col.notNull())
        .addColumn("authorDid", "text", (col) => col.notNull())
        .addColumn("sessionUri", "text", (col) => col.notNull())
        .addColumn("clueId", "text")
        .addColumn("text", "text", (col) => col.notNull())
        .addColumn("createdAt", "text", (col) => col.notNull())
        .addColumn("indexedAt", "text", (col) => col.notNull())
        .execute();
      await db.schema
        .createIndex("comment_session_clue_idx")
        .on("comment")
        .columns(["sessionUri", "clueId"])
        .execute();

      await db.schema
        .createTable("puzzle")
        .addColumn("uri", "text", (col) => col.primaryKey())
        .addColumn("cid", "text", (col) => col.notNull())
        .addColumn("authorDid", "text", (col) => col.notNull())
        .addColumn("title", "text", (col) => col.notNull())
        .addColumn("cluesJson", "text", (col) => col.notNull())
        .addColumn("createdAt", "text", (col) => col.notNull())
        .addColumn("indexedAt", "text", (col) => col.notNull())
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("puzzle").execute();
      await db.schema.dropTable("comment").execute();
      await db.schema.dropTable("attempt").execute();
      await db.schema.dropTable("session").execute();
      await db.schema.dropTable("invite").execute();
      await db.schema.dropTable("member").execute();
      await db.schema.dropTable("team").execute();
      await db.schema.dropTable("account").execute();
      await db.schema.dropTable("auth_session").execute();
      await db.schema.dropTable("auth_state").execute();
    },
  },
};

export function getMigrator() {
  const db = getDb();
  return new Migrator({
    db,
    provider: {
      getMigrations: async () => migrations,
    },
  });
}
