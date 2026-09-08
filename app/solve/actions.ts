"use server";

import { asAtIdentifierString, currentDatetimeString } from "@atproto/syntax";
import { getSession } from "@/lib/auth/session";
import { getAtpClient } from "@/lib/atproto/client";
import { decryptAnswerKeySafe } from "@/lib/crypto/answerBlock";
import { checkSubmission } from "@/lib/puzzles/verdict";
import * as us from "@/lib/lexicons/us";

export interface SubmitAttemptInput {
  authorDid: string;
  rkey: string;
  text: string;
}

export type SubmitAttemptResult =
  | { ok: true; correct: true; answerId: string; answerName: string; canonical: string; solvedAt: string }
  | { ok: true; correct: false; hint?: string }
  | { ok: false; error: string };

export async function submitAttempt(
  input: SubmitAttemptInput,
): Promise<SubmitAttemptResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const text = input.text.trim();
  if (!text) return { ok: false, error: "Enter an answer first." };

  const client = getAtpClient(session);

  let puzzle;
  try {
    puzzle = await client.get(us.puzzling.puzzle.main, {
      repo: asAtIdentifierString(input.authorDid),
      rkey: input.rkey,
    });
  } catch (err) {
    console.error(
      `submitAttempt: failed to load puzzle at://${input.authorDid}/us.puzzling.puzzle/${input.rkey}`,
      err,
    );
    return { ok: false, error: "Couldn't load this puzzle." };
  }
  if (!puzzle.cid) return { ok: false, error: "Couldn't load this puzzle." };

  const answerKey = decryptAnswerKeySafe(puzzle.value.answers);
  // Not targeted at a specific answer up front -- checked against the whole
  // pool, and we only learn which (if any) answer it was after checking.
  const verdict = checkSubmission(text, answerKey);

  // Log every attempt regardless of verdict -- the record has no
  // correctness field by design (see puzzling.attempt.json), since
  // verdicts are computed at render time and can shift if the answer key
  // is later corrected.
  const createdAt = currentDatetimeString();
  try {
    await client.create(us.puzzling.attempt.main, {
      puzzle: { uri: puzzle.uri, cid: puzzle.cid },
      ...(verdict.correct ? { answerId: verdict.answer.id } : {}),
      text,
      createdAt,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to record attempt.",
    };
  }

  if (verdict.correct) {
    return {
      ok: true,
      correct: true,
      answerId: verdict.answer.id,
      answerName: verdict.answer.name,
      canonical: verdict.answer.canonical,
      solvedAt: createdAt,
    };
  }
  return { ok: true, correct: false, hint: verdict.hint };
}
