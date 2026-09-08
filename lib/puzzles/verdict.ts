import type { Answer, AnswerKey } from "@/lib/crypto/answerBlock";

// A submission is checked against the whole puzzle's answer pool, not one
// answer at a time -- most puzzle types don't ask "which clue is this
// guessing at" up front (see puzzling.attempt.json's answerId). A match
// against an answer's canonical or one of its alternates solves that
// answer; a match against a hint's trigger surfaces its message without
// solving anything.
export type PuzzleVerdict =
  | { correct: true; answer: Answer }
  | { correct: false; hint?: string };

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function checkSubmission(
  attemptText: string,
  answerKey: AnswerKey,
): PuzzleVerdict {
  const normalized = normalize(attemptText);
  if (!normalized) return { correct: false };

  for (const answer of answerKey.answers) {
    if (normalize(answer.canonical) === normalized) return { correct: true, answer };
    for (const alt of answer.alternates) {
      if (normalize(alt) === normalized) return { correct: true, answer };
    }
  }

  for (const hint of answerKey.hints) {
    if (normalize(hint.match) === normalized) {
      return { correct: false, hint: hint.message };
    }
  }

  return { correct: false };
}
