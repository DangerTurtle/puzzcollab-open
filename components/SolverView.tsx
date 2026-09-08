"use client";

import { useState, useTransition } from "react";
import { submitAttempt } from "@/app/solve/actions";

export interface SolvedAnswer {
  id: string;
  name: string;
  canonical: string;
  solverHandle: string;
  solvedAt: string;
}

export function SolverView({
  authorDid,
  rkey,
  title,
  authorHandle,
  body,
  solved: initialSolved,
  isAuthor,
  viewerHandle,
}: {
  authorDid: string;
  rkey: string;
  title: string;
  authorHandle: string;
  body: string;
  solved: SolvedAnswer[];
  isAuthor: boolean;
  viewerHandle: string;
}) {
  const [solved, setSolved] = useState(initialSolved);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const text = draft.trim();
    if (!text || isAuthor) return;

    setFeedback(null);
    startTransition(async () => {
      const result = await submitAttempt({ authorDid, rkey, text });

      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      if (result.correct) {
        setDraft("");
        setFeedback(null);
        setSolved((s) =>
          s.some((a) => a.id === result.answerId)
            ? s
            : [
                ...s,
                {
                  id: result.answerId,
                  name: result.answerName,
                  canonical: result.canonical,
                  solverHandle: viewerHandle,
                  solvedAt: result.solvedAt,
                },
              ],
        );
      } else {
        setFeedback(result.hint ? `Hint: ${result.hint}` : "Not quite -- try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-800 italic text-2xl mb-1">{title}</h1>
        <p className="text-sm text-ink-soft italic">by {authorHandle}</p>
      </div>

      <div className="card whitespace-pre-wrap text-[15px] leading-relaxed">
        {body}
      </div>

      {solved.length > 0 && (
        <div>
          <div className="section-label mb-3">Solved</div>
          <div className="space-y-2">
            {solved.map((answer) => (
              <div key={answer.id} className="card">
                <div className="flex items-center gap-2">
                  <span className="font-display font-600 italic text-lg whitespace-nowrap">
                    {answer.name}
                  </span>
                  <span className="field-input bg-paper-card font-semibold flex-1">
                    {answer.canonical}
                  </span>
                </div>
                <p className="text-xs text-pencil mt-1">
                  Solved by {answer.solverHandle} at{" "}
                  {new Date(answer.solvedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex gap-2">
          {!isAuthor && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="stamp teal shrink-0"
            >
              {isPending ? "..." : "Submit"}
            </button>
          )}
          <div className="flex-1">
            <input
              className="field-input"
              value={draft}
              disabled={isAuthor}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Answer here"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
        </div>
        {feedback && <p className="text-xs text-stamp mt-1">{feedback}</p>}
      </div>
    </div>
  );
}
