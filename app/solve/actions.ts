"use server";

import { asAtIdentifierString, currentDatetimeString } from "@atproto/syntax";
import { getSession } from "@/lib/auth/session";
import { getAtpClient } from "@/lib/atproto/client";
import { decryptAnswerKeySafe } from "@/lib/crypto/answerBlock";
import { checkAnswer } from "@/lib/puzzles/verdict";
import * as us from "@/lib/lexicons/us";

export interface SubmitAttemptInput {
  authorDid: string;
  rkey: string;
  clueId: string;
  text: string;
}

export type SubmitAttemptResult =
  | { ok: true; correct: true; canonical: string; solvedAt: string }
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

  const clue = puzzle.value.clues.find((c) => c.id === input.clueId);
  if (!clue) return { ok: false, error: "That clue no longer exists." };

  const answerKey = decryptAnswerKeySafe(clue.answerBlock);
  const verdict = checkAnswer(text, answerKey);

  // Log every attempt regardless of verdict -- the record has no
  // correctness field by design (see puzzling.attempt.json), since
  // verdicts are computed at render time and can shift if the answer key
  // is later corrected.
  const createdAt = currentDatetimeString();
  try {
    await client.create(us.puzzling.attempt.main, {
      puzzle: { uri: puzzle.uri, cid: puzzle.cid },
      clueId: input.clueId,
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
    return { ok: true, correct: true, canonical: answerKey.canonical, solvedAt: createdAt };
  }
  return { ok: true, correct: false, hint: verdict.hint };
}
