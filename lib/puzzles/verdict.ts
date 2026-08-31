import type { AnswerKey } from "@/lib/crypto/answerBlock";

// An attempt matching the canonical answer, or an "accept" alternate (one
// with no hint), solves the clue. One matching a "hint" alternate doesn't --
// it just surfaces that alternate's hint text, same as typing a near-miss.
export type Verdict =
  | { correct: true }
  | { correct: false; hint?: string };

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function checkAnswer(attemptText: string, answerKey: AnswerKey): Verdict {
  const normalized = normalize(attemptText);
  if (!normalized) return { correct: false };

  if (normalize(answerKey.canonical) === normalized) return { correct: true };

  for (const alt of answerKey.accepted) {
    if (normalize(alt.match) === normalized) {
      return alt.hint ? { correct: false, hint: alt.hint } : { correct: true };
    }
  }

  return { correct: false };
}
