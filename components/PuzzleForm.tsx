"use client";

import { useState, useTransition } from "react";
import {
  savePuzzle,
  deletePuzzle,
  type AnswerInput,
  type HintInput,
  type PuzzleFormInput,
} from "@/app/puzzles/actions";
import {
  defaultScheduledAt,
  statusFromPublishAt,
  type PuzzleStatus,
} from "@/lib/puzzles/status";

function newAnswer(index: number): AnswerInput {
  return {
    id: crypto.randomUUID(),
    name: String(index + 1),
    canonical: "",
    alternates: [],
  };
}

function newHint(): HintInput {
  return { match: "", message: "" };
}

// datetime-local wants "YYYY-MM-DDTHH:mm"; puzzle records store full ISO.
function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16);
}

export interface PuzzleFormInitialValues {
  rkey?: string;
  createdAt?: string;
  format?: string;
  title: string;
  body: string;
  publishAt: string;
  answers: AnswerInput[];
  hints: HintInput[];
}

const STATUS_LABEL: Record<PuzzleStatus, string> = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
};

export function PuzzleForm({
  initialValues,
}: {
  initialValues?: PuzzleFormInitialValues;
}) {
  const isEdit = Boolean(initialValues?.rkey);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");

  const initialStatus: PuzzleStatus = initialValues
    ? statusFromPublishAt(initialValues.publishAt)
    : "draft";
  const [status, setStatus] = useState<PuzzleStatus>(initialStatus);
  const [scheduledAt, setScheduledAt] = useState(
    initialStatus === "scheduled" && initialValues
      ? toDatetimeLocal(initialValues.publishAt)
      : toDatetimeLocal(defaultScheduledAt().toISOString()),
  );

  const [answers, setAnswers] = useState<AnswerInput[]>(
    initialValues?.answers ?? [],
  );
  const [hints, setHints] = useState<HintInput[]>(initialValues?.hints ?? []);
  const [expandedAlternates, setExpandedAlternates] = useState<Set<string>>(
    new Set(),
  );

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function updateAnswer(index: number, patch: Partial<AnswerInput>) {
    setAnswers((as) => as.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function addAnswer() {
    setAnswers((as) => [...as, newAnswer(as.length)]);
  }

  function removeAnswer(index: number) {
    setAnswers((as) => as.filter((_, i) => i !== index));
  }

  function toggleAlternates(answerId: string) {
    setExpandedAlternates((s) => {
      const next = new Set(s);
      if (next.has(answerId)) next.delete(answerId);
      else next.add(answerId);
      return next;
    });
  }

  function addAlternate(answerIndex: number) {
    updateAnswer(answerIndex, {
      alternates: [...answers[answerIndex].alternates, ""],
    });
  }

  function updateAlternate(answerIndex: number, altIndex: number, value: string) {
    const alternates = answers[answerIndex].alternates.map((a, i) =>
      i === altIndex ? value : a,
    );
    updateAnswer(answerIndex, { alternates });
  }

  function removeAlternate(answerIndex: number, altIndex: number) {
    updateAnswer(answerIndex, {
      alternates: answers[answerIndex].alternates.filter((_, i) => i !== altIndex),
    });
  }

  function handleCanonicalKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (e.key !== "Enter") return;
    const isLastAnswer = index === answers.length - 1;
    if (!isLastAnswer || !answers[index].canonical.trim()) return;
    e.preventDefault();
    addAnswer();
  }

  function updateHint(index: number, patch: Partial<HintInput>) {
    setHints((hs) => hs.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  function addHint() {
    setHints((hs) => [...hs, newHint()]);
  }

  function removeHint(index: number) {
    setHints((hs) => hs.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: PuzzleFormInput = {
      rkey: initialValues?.rkey,
      createdAt: initialValues?.createdAt,
      format: initialValues?.format,
      title,
      body,
      status,
      scheduledAt:
        status === "scheduled" ? new Date(scheduledAt).toISOString() : undefined,
      answers,
      hints,
    };

    startTransition(async () => {
      const result = await savePuzzle(input);
      if (!result.ok) {
        setError(result.error ?? "Failed to save puzzle.");
      }
    });
  }

  function handleDelete() {
    if (!initialValues?.rkey) return;
    const confirmed = window.confirm(
      `Delete "${title || "this puzzle"}"? This action cannot be undone -- the puzzle and all of its answers will be permanently deleted.`,
    );
    if (!confirmed) return;

    setError(null);
    startDeleteTransition(async () => {
      const result = await deletePuzzle(initialValues.rkey!);
      if (!result.ok) {
        setError(result.error ?? "Failed to delete puzzle.");
      }
    });
  }

  const submitLabel = isPending
    ? "Saving..."
    : status === "scheduled"
      ? "Schedule For Future"
      : status === "draft"
        ? isEdit
          ? "Save Changes"
          : "Save as Draft"
        : isEdit
          ? "Publish Changes"
          : "Publish Now";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="card space-y-4">
          <div>
            <label className="field-label" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Six Across, Nine Down"
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="body">
              Puzzle body
            </label>
            <textarea
              id="body"
              className="field-input"
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="The grid, the question set, whatever the format needs -- shown to solvers as-is."
              required
            />
          </div>

          <div>
            <span className="field-label">Status</span>
            <div className="flex items-center gap-5 flex-wrap">
              {(Object.keys(STATUS_LABEL) as PuzzleStatus[]).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <input
                    type="radio"
                    name="status"
                    checked={status === s}
                    onChange={() => setStatus(s)}
                  />
                  {STATUS_LABEL[s]}
                </label>
              ))}
              <input
                type="datetime-local"
                className="field-input w-auto py-1.5"
                value={scheduledAt}
                disabled={status !== "scheduled"}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="stamp red text-xs ml-auto"
                >
                  {isDeleting ? "Deleting..." : "Delete Puzzle"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 space-y-6">
          <div>
            <div className="section-label mb-3">Answers</div>
            <div className="space-y-3 lg:max-h-[45vh] lg:overflow-y-auto lg:pr-2">
              {answers.length === 0 && (
                <p className="text-ink-soft italic text-sm">
                  No answers yet -- add one whenever you&apos;re ready.
                </p>
              )}
              {answers.map((answer, i) => (
                <div key={answer.id} className="card">
                  <div className="flex items-center gap-2">
                    <div className="w-16 shrink-0">
                      <input
                        className="field-input text-center"
                        value={answer.name}
                        onChange={(e) => updateAnswer(i, { name: e.target.value })}
                        placeholder={String(i + 1)}
                        aria-label="Answer id"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        className="field-input"
                        value={answer.canonical}
                        onChange={(e) => updateAnswer(i, { canonical: e.target.value })}
                        onKeyDown={(e) => handleCanonicalKeyDown(e, i)}
                        placeholder="Answer"
                        aria-label="Answer value"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAnswer(i)}
                      className="text-sm text-stamp hover:underline whitespace-nowrap"
                    >
                      Remove
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAlternates(answer.id)}
                    className="text-xs text-teal hover:underline mt-2"
                  >
                    {expandedAlternates.has(answer.id) ? "▾" : "▸"} Alternate
                    forms
                    {answer.alternates.length > 0 ? ` (${answer.alternates.length})` : ""}
                  </button>

                  {expandedAlternates.has(answer.id) && (
                    <div className="space-y-2 mt-2">
                      {answer.alternates.map((alt, ai) => (
                        <div key={ai} className="flex items-center gap-2">
                          <input
                            className="field-input flex-1"
                            value={alt}
                            onChange={(e) => updateAlternate(i, ai, e.target.value)}
                            placeholder="alternate form"
                          />
                          <button
                            type="button"
                            onClick={() => removeAlternate(i, ai)}
                            className="text-stamp text-sm px-2"
                            aria-label="Remove alternate form"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addAlternate(i)}
                        className="text-sm text-teal hover:underline"
                      >
                        + Add alternate form
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={addAnswer} className="stamp teal text-xs">
                + Add Answer
              </button>
            </div>
          </div>

          <div>
            <div className="section-label mb-3">Hints</div>
            <div className="space-y-2 lg:max-h-[25vh] lg:overflow-y-auto lg:pr-2">
              {hints.length === 0 && (
                <p className="text-ink-soft italic text-sm">No hints yet.</p>
              )}
              {hints.map((hint, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-32 shrink-0">
                    <input
                      className="field-input"
                      value={hint.match}
                      onChange={(e) => updateHint(i, { match: e.target.value })}
                      placeholder="attempt"
                      aria-label="Hint trigger"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      className="field-input"
                      value={hint.message}
                      onChange={(e) => updateHint(i, { message: e.target.value })}
                      placeholder="message shown"
                      aria-label="Hint message"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHint(i)}
                    className="text-stamp text-sm px-2"
                    aria-label="Remove hint"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" onClick={addHint} className="stamp mustard text-xs">
                + Add Hint
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-stamp text-sm">{error}</p>}

      <button type="submit" disabled={isPending} className="stamp red">
        {submitLabel}
      </button>
    </form>
  );
}
