"use server";

import { redirect } from "next/navigation";
import { currentDatetimeString, normalizeDatetime } from "@atproto/syntax";
import { getSession } from "@/lib/auth/session";
import { getAtpClient } from "@/lib/atproto/client";
import { encryptAnswerKey } from "@/lib/crypto/answerBlock";
import { publishAtFromStatus, type PuzzleStatus } from "@/lib/puzzles/status";
import * as us from "@/lib/lexicons/us";

// An alternate answer either counts as a solve (mode "accept" -- an
// alternate acceptable form of the canonical answer) or doesn't (mode
// "hint" -- shown to a solver who enters it, but the puzzle isn't solved
// until they enter the canonical answer or an "accept" alternate). The hint
// text box is only meaningful -- and only saved -- when mode is "hint".
export interface AlternateAnswer {
  match: string;
  mode: "accept" | "hint";
  hint: string;
}

export interface ClueInput {
  id: string;
  name: string;
  /** Optional -- the prompt often lives in the puzzle body itself, and the clue is just where the answer goes. */
  prompt: string;
  canonical: string;
  alternates: AlternateAnswer[];
}

export interface PuzzleFormInput {
  /** Present when editing an existing puzzle; absent when authoring a new one. */
  rkey?: string;
  /** Preserved from the original record on edit; unset (defaults to now) on create. */
  createdAt?: string;
  title: string;
  body: string;
  status: PuzzleStatus;
  /** Required (and only meaningful) when status is "scheduled". */
  scheduledAt?: string;
  clues: ClueInput[];
}

export interface SavePuzzleResult {
  ok: boolean;
  error?: string;
}

export async function savePuzzle(
  input: PuzzleFormInput,
): Promise<SavePuzzleResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  if (!input.body.trim())
    return { ok: false, error: "Puzzle body is required." };
  if (input.status !== "draft" && input.clues.length === 0) {
    return {
      ok: false,
      error: "Add at least one clue before publishing or scheduling.",
    };
  }
  if (input.status === "scheduled" && !input.scheduledAt) {
    return { ok: false, error: "Pick a date to schedule this puzzle for." };
  }
  for (const clue of input.clues) {
    if (!clue.name.trim() || !clue.canonical.trim()) {
      return {
        ok: false,
        error: "Every clue needs a name and an answer.",
      };
    }
  }

  const clues = input.clues.map((clue) => ({
    id: clue.id,
    name: clue.name,
    prompt: clue.prompt,
    answerBlock: encryptAnswerKey({
      canonical: clue.canonical,
      accepted: clue.alternates
        .filter((a) => a.match.trim())
        .map((a) => ({
          match: a.match,
          ...(a.mode === "hint" && a.hint.trim()
            ? { hint: a.hint.trim() }
            : {}),
        })),
    }),
  }));

  const publishAt = publishAtFromStatus(input.status, input.scheduledAt ?? null);

  const record = {
    title: input.title,
    body: input.body,
    clues,
    createdAt: input.createdAt
      ? normalizeDatetime(input.createdAt)
      : currentDatetimeString(),
    ...(publishAt ? { publishAt: normalizeDatetime(publishAt) } : {}),
  };

  const client = getAtpClient(session);
  try {
    if (input.rkey) {
      await client.put(us.puzzling.puzzle.main, record, {
        repo: session.did,
        rkey: input.rkey,
      });
    } else {
      await client.create(us.puzzling.puzzle.main, record);
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save puzzle.",
    };
  }

  redirect("/puzzles");
}

export async function deletePuzzle(rkey: string): Promise<SavePuzzleResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const client = getAtpClient(session);
  try {
    await client.delete(us.puzzling.puzzle.main, {
      repo: session.did,
      rkey,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete puzzle.",
    };
  }

  redirect("/puzzles");
}
