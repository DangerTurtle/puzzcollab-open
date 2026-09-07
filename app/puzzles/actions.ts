"use server";

import { redirect } from "next/navigation";
import { currentDatetimeString, normalizeDatetime } from "@atproto/syntax";
import { getSession } from "@/lib/auth/session";
import { getAtpClient } from "@/lib/atproto/client";
import { encryptAnswerKey } from "@/lib/crypto/answerBlock";
import { publishAtFromStatus, type PuzzleStatus } from "@/lib/puzzles/status";
import * as us from "@/lib/lexicons/us";

export interface AnswerInput {
  id: string;
  name: string;
  canonical: string;
  alternates: string[];
}

export interface HintInput {
  match: string;
  message: string;
}

export interface PuzzleFormInput {
  /** Present when editing an existing puzzle; absent when authoring a new one. */
  rkey?: string;
  /** Preserved from the original record on edit; unset (defaults to now) on create. */
  createdAt?: string;
  /** Preserved from the original record on edit; unset (defaults to "plain") on create -- not yet exposed as its own control. */
  format?: string;
  title: string;
  body: string;
  status: PuzzleStatus;
  /** Required (and only meaningful) when status is "scheduled". */
  scheduledAt?: string;
  answers: AnswerInput[];
  hints: HintInput[];
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
  if (input.status !== "draft" && input.answers.length === 0) {
    return {
      ok: false,
      error: "Add at least one answer before publishing or scheduling.",
    };
  }
  if (input.status === "scheduled" && !input.scheduledAt) {
    return { ok: false, error: "Pick a date to schedule this puzzle for." };
  }
  for (const answer of input.answers) {
    if (!answer.name.trim() || !answer.canonical.trim()) {
      return { ok: false, error: "Every answer needs an id and a value." };
    }
  }
  for (const hint of input.hints) {
    if (!hint.match.trim() || !hint.message.trim()) {
      return {
        ok: false,
        error: "Every hint needs an attempt and a message.",
      };
    }
  }

  const answersBlock = encryptAnswerKey({
    answers: input.answers.map((a) => ({
      id: a.id,
      name: a.name,
      canonical: a.canonical,
      alternates: a.alternates.filter((alt) => alt.trim()),
    })),
    hints: input.hints
      .filter((h) => h.match.trim() && h.message.trim())
      .map((h) => ({ match: h.match, message: h.message })),
  });

  const publishAt = publishAtFromStatus(input.status, input.scheduledAt ?? null);

  const record = {
    title: input.title,
    body: input.body,
    meta: { format: input.format ?? "plain" },
    answers: answersBlock,
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
