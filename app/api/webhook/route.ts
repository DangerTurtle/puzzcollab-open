import { NextRequest, NextResponse } from "next/server";
import { parseTapEvent, assureAdminAuth } from "@atproto/tap";
import { lexParse } from "@atproto/lex";
import { AtUri } from "@atproto/syntax";
import {
  upsertAccount,
  deleteAccount,
  upsertTeam,
  deleteTeam,
  upsertMember,
  deleteMember,
  upsertInvite,
  deleteInvite,
  upsertSession,
  deleteSession,
  upsertAttempt,
  deleteAttempt,
  upsertComment,
  deleteComment,
  upsertPuzzle,
  deletePuzzle,
  upsertErratum,
  deleteErratum,
} from "@/lib/db/queries";
import * as us from "@/lib/lexicons/us";

const TAP_ADMIN_PASSWORD = process.env.TAP_ADMIN_PASSWORD;

// Shared by puzzle.clues and erratum.revisedClues -- both are arrays of the
// same us.puzzling.puzzle#clue shape, and both need answerBlock flattened to
// base64 to fit in a text column.
function serializeClues(clues: readonly { id: string; name: string; prompt: string; answerBlock: Uint8Array }[]): string {
  return JSON.stringify(
    clues.map((clue) => ({
      id: clue.id,
      name: clue.name,
      prompt: clue.prompt,
      answerBlock: Buffer.from(clue.answerBlock).toString("base64"),
    })),
  );
}

export async function POST(request: NextRequest) {
  // Verify request is from our TAP server
  if (TAP_ADMIN_PASSWORD) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      assureAdminAuth(TAP_ADMIN_PASSWORD, authHeader);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Plain JSON.parse (what request.json() uses) leaves atproto's special
  // {$bytes: "..."} / {$link: "..."} wrappers as plain objects -- lexParse
  // decodes those into real Uint8Array/Cid values as part of parsing, which
  // our own lexicons' bytes-typed fields (answerBlock) need to validate.
  const body = lexParse(await request.text());
  const evt = parseTapEvent(body);

  // Handle account/identity changes
  if (evt.type === "identity") {
    if (evt.status === "deleted") {
      await deleteAccount(evt.did);
    } else {
      await upsertAccount({
        did: evt.did,
        handle: evt.handle,
        active: evt.isActive ? 1 : 0,
      });
    }
    return NextResponse.json({ success: true });
  }

  // Handle record changes
  const uri = AtUri.make(evt.did, evt.collection, evt.rkey).toString();
  const indexedAt = new Date().toISOString();

  if (evt.action === "delete") {
    switch (evt.collection) {
      case us.puzzling.team.$nsid:
        await deleteTeam(uri);
        break;
      case us.puzzling.member.$nsid:
        await deleteMember(uri);
        break;
      case us.puzzling.invite.$nsid:
        await deleteInvite(uri);
        break;
      case us.puzzling.session.$nsid:
        await deleteSession(uri);
        break;
      case us.puzzling.attempt.$nsid:
        await deleteAttempt(uri);
        break;
      case us.puzzling.comment.$nsid:
        await deleteComment(uri);
        break;
      case us.puzzling.puzzle.$nsid:
        await deletePuzzle(uri);
        break;
      case us.puzzling.erratum.$nsid:
        await deleteErratum(uri);
        break;
    }
    return NextResponse.json({ success: true });
  }

  // create or update
  const cid = evt.cid;
  if (!cid) {
    return NextResponse.json({ success: false });
  }
  try {
    switch (evt.collection) {
      case us.puzzling.team.$nsid: {
        const record = us.puzzling.team.$parse(evt.record);
        await upsertTeam({
          uri,
          cid,
          name: record.name,
          description: record.description ?? null,
          creatorDid: record.creatorDid ?? null,
          createdAt: record.createdAt,
          indexedAt,
        });
        break;
      }
      case us.puzzling.member.$nsid: {
        const record = us.puzzling.member.$parse(evt.record);
        await upsertMember({
          uri,
          cid,
          teamUri: record.team.uri,
          memberDid: record.memberDid,
          addedAt: record.addedAt,
          invitedByUri: record.invitedBy?.uri ?? null,
          indexedAt,
        });
        break;
      }
      case us.puzzling.invite.$nsid: {
        const record = us.puzzling.invite.$parse(evt.record);
        await upsertInvite({
          uri,
          cid,
          sessionUri: record.session.uri,
          joinPolicy: record.joinPolicy,
          creatorDid: record.creatorDid,
          createdAt: record.createdAt,
          indexedAt,
        });
        break;
      }
      case us.puzzling.session.$nsid: {
        const record = us.puzzling.session.$parse(evt.record);
        await upsertSession({
          uri,
          cid,
          teamUri: record.team.uri,
          puzzleUri: record.puzzle.uri,
          creatorDid: record.creatorDid ?? null,
          createdAt: record.createdAt,
          indexedAt,
        });
        break;
      }
      case us.puzzling.attempt.$nsid: {
        const record = us.puzzling.attempt.$parse(evt.record);
        await upsertAttempt({
          uri,
          cid,
          authorDid: evt.did,
          sessionUri: record.session.uri,
          clueId: record.clueId,
          text: record.text,
          createdAt: record.createdAt,
          indexedAt,
        });
        break;
      }
      case us.puzzling.comment.$nsid: {
        const record = us.puzzling.comment.$parse(evt.record);
        await upsertComment({
          uri,
          cid,
          authorDid: evt.did,
          sessionUri: record.session.uri,
          clueId: record.clueId ?? null,
          text: record.text,
          createdAt: record.createdAt,
          indexedAt,
        });
        break;
      }
      case us.puzzling.puzzle.$nsid: {
        const record = us.puzzling.puzzle.$parse(evt.record);
        await upsertPuzzle({
          uri,
          cid,
          authorDid: evt.did,
          title: record.title,
          body: record.body,
          cluesJson: serializeClues(record.clues),
          createdAt: record.createdAt,
          indexedAt,
        });
        break;
      }
      case us.puzzling.erratum.$nsid: {
        const record = us.puzzling.erratum.$parse(evt.record);
        await upsertErratum({
          uri,
          cid,
          puzzleUri: record.puzzle.uri,
          authorDid: record.authorDid,
          text: record.text,
          revisedCluesJson: record.revisedClues ? serializeClues(record.revisedClues) : null,
          createdAt: record.createdAt,
          indexedAt,
        });
        break;
      }
      default:
        // Not one of ours -- shouldn't happen given TAP_COLLECTION_FILTERS,
        // but ignore rather than error if it does.
        break;
    }
  } catch (error) {
    // Record didn't parse against our lexicon -- ignore rather than fail
    // the whole webhook delivery, same as the original Statusphere handler.
    // Still log it: a silently-dropped record is exactly the kind of bug
    // that's invisible until someone asks "why didn't my write show up".
    console.error(`webhook: failed to parse ${evt.collection} record ${uri}`, error);
    return NextResponse.json({ success: false });
  }

  return NextResponse.json({ success: true });
}
