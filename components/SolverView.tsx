"use client";

import { useState, useTransition } from "react";
import { submitAttempt } from "@/app/solve/actions";

export interface SolverClue {
  id: string;
  name: string;
  prompt: string;
  solved: { canonical: string; solverHandle: string; solvedAt: string } | null;
}

export function SolverView({
  authorDid,
  rkey,
  title,
  body,
  clues: initialClues,
  isAuthor,
  viewerHandle,
}: {
  authorDid: string;
  rkey: string;
  title: string;
  body: string;
  clues: SolverClue[];
  isAuthor: boolean;
  viewerHandle: string;
}) {
  const [clues, setClues] = useState(initialClues);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string | null>>({});
  const [pendingClueId, setPendingClueId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit(clueId: string) {
    const text = (drafts[clueId] ?? "").trim();
    if (!text || isAuthor) return;

    setPendingClueId(clueId);
    setFeedback((f) => ({ ...f, [clueId]: null }));

    startTransition(async () => {
      const result = await submitAttempt({ authorDid, rkey, clueId, text });
      setPendingClueId(null);

      if (!result.ok) {
        setFeedback((f) => ({ ...f, [clueId]: result.error }));
        return;
      }
      if (result.correct) {
        setClues((cs) =>
          cs.map((c) =>
            c.id === clueId
              ? {
                  ...c,
                  solved: {
                    canonical: result.canonical,
                    solverHandle: viewerHandle,
                    solvedAt: result.solvedAt,
                  },
                }
              : c,
          ),
        );
      } else {
        setFeedback((f) => ({
          ...f,
          [clueId]: result.hint ? `Hint: ${result.hint}` : "Not quite -- try again.",
        }));
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="card space-y-4">
        <h1 className="font-display font-800 italic text-2xl">{title}</h1>
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {body}
        </div>
      </div>

      <div className="lg:sticky lg:top-6">
        <div className="section-label mb-3">Clues</div>
        <div className="space-y-4 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-2">
          {clues.map((clue) => (
            <div key={clue.id} className="card">
              {clue.prompt && (
                <p className="text-sm text-ink-soft mb-2">{clue.prompt}</p>
              )}

              <div className="flex items-center gap-2">
                <span className="font-display font-600 italic text-lg whitespace-nowrap">
                  {clue.name}
                </span>

                {clue.solved ? (
                  <div className="field-input bg-paper-card font-semibold flex-1">
                    {clue.solved.canonical}
                  </div>
                ) : (
                  <>
                    <input
                      className="field-input flex-1"
                      value={drafts[clue.id] ?? ""}
                      disabled={isAuthor}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [clue.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSubmit(clue.id);
                        }
                      }}
                    />
                    {!isAuthor && (
                      <button
                        type="button"
                        onClick={() => handleSubmit(clue.id)}
                        disabled={pendingClueId === clue.id}
                        className="stamp teal text-xs"
                      >
                        {pendingClueId === clue.id ? "..." : "Submit"}
                      </button>
                    )}
                  </>
                )}
              </div>

              {clue.solved && (
                <p className="text-xs text-pencil mt-1">
                  Solved by {clue.solved.solverHandle} at{" "}
                  {new Date(clue.solved.solvedAt).toLocaleString()}
                </p>
              )}
              {feedback[clue.id] && (
                <p className="text-xs text-stamp mt-1">{feedback[clue.id]}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
