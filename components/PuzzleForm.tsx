"use client";

import { useState, useTransition } from "react";
import {
  savePuzzle,
  deletePuzzle,
  type AlternateAnswer,
  type ClueInput,
  type PuzzleFormInput,
} from "@/app/puzzles/actions";
import {
  defaultScheduledAt,
  statusFromPublishAt,
  type PuzzleStatus,
} from "@/lib/puzzles/status";

function newClue(index: number): ClueInput {
  return {
    id: crypto.randomUUID(),
    name: String(index + 1),
    prompt: "",
    canonical: "",
    alternates: [],
  };
}

function newAlternate(): AlternateAnswer {
  return { match: "", mode: "hint", hint: "" };
}

// datetime-local wants "YYYY-MM-DDTHH:mm"; puzzle records store full ISO.
function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16);
}

export interface PuzzleFormInitialValues {
  rkey?: string;
  createdAt?: string;
  title: string;
  body: string;
  publishAt: string;
  clues: ClueInput[];
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

  const [clues, setClues] = useState<ClueInput[]>(initialValues?.clues ?? []);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function updateClue(index: number, patch: Partial<ClueInput>) {
    setClues((cs) => cs.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addClue() {
    setClues((cs) => [...cs, newClue(cs.length)]);
  }

  function removeClue(index: number) {
    setClues((cs) => cs.filter((_, i) => i !== index));
  }

  function handleCanonicalKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (e.key !== "Enter") return;
    const isLastClue = index === clues.length - 1;
    if (!isLastClue || !clues[index].canonical.trim()) return;
    e.preventDefault();
    addClue();
  }

  function addAlternate(clueIndex: number) {
    updateClue(clueIndex, {
      alternates: [...clues[clueIndex].alternates, newAlternate()],
    });
  }

  function updateAlternate(
    clueIndex: number,
    altIndex: number,
    patch: Partial<AlternateAnswer>,
  ) {
    const alternates = clues[clueIndex].alternates.map((a, i) =>
      i === altIndex ? { ...a, ...patch } : a,
    );
    updateClue(clueIndex, { alternates });
  }

  function removeAlternate(clueIndex: number, altIndex: number) {
    updateClue(clueIndex, {
      alternates: clues[clueIndex].alternates.filter((_, i) => i !== altIndex),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: PuzzleFormInput = {
      rkey: initialValues?.rkey,
      createdAt: initialValues?.createdAt,
      title,
      body,
      status,
      scheduledAt:
        status === "scheduled" ? new Date(scheduledAt).toISOString() : undefined,
      clues,
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
      `Delete "${title || "this puzzle"}"? This action cannot be undone -- the puzzle and all of its clues will be permanently deleted.`,
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

        <div className="lg:sticky lg:top-6">
          <div className="section-label mb-3">Clues</div>
          <div className="space-y-4 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-2">
            {clues.length === 0 && (
              <p className="text-ink-soft italic text-sm">
                No clues yet -- add one whenever you&apos;re ready.
              </p>
            )}
            {clues.map((clue, i) => (
              <div key={clue.id} className="card">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <label className="field-label">Clue name</label>
                    <input
                      className="field-input"
                      value={clue.name}
                      onChange={(e) => updateClue(i, { name: e.target.value })}
                      placeholder={String(i + 1)}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeClue(i)}
                    className="text-sm text-stamp hover:underline mt-6"
                  >
                    Remove
                  </button>
                </div>

                <label className="field-label">
                  Prompt{" "}
                  <span className="normal-case text-pencil">
                    (optional -- leave blank if the prompt is in the puzzle body itself)
                  </span>
                </label>
                <textarea
                  className="field-input mb-4"
                  rows={2}
                  value={clue.prompt}
                  onChange={(e) => updateClue(i, { prompt: e.target.value })}
                />

                <label className="field-label">Canonical answer</label>
                <input
                  className="field-input mb-4"
                  value={clue.canonical}
                  onChange={(e) => updateClue(i, { canonical: e.target.value })}
                  onKeyDown={(e) => handleCanonicalKeyDown(e, i)}
                  required
                />

                <label className="field-label">Alternate answers</label>
                <div className="space-y-2 mb-2">
                  {clue.alternates.map((a, ai) => (
                    <div key={ai} className="flex items-center gap-2 flex-wrap">
                      <input
                        className="field-input flex-1 min-w-[140px]"
                        value={a.match}
                        onChange={(e) =>
                          updateAlternate(i, ai, { match: e.target.value })
                        }
                        placeholder="alternate answer"
                      />
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                        <input
                          type="radio"
                          name={`alt-mode-${clue.id}-${ai}`}
                          checked={a.mode === "accept"}
                          onChange={() => updateAlternate(i, ai, { mode: "accept" })}
                        />
                        Accept
                      </label>
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                        <input
                          type="radio"
                          name={`alt-mode-${clue.id}-${ai}`}
                          checked={a.mode === "hint"}
                          onChange={() => updateAlternate(i, ai, { mode: "hint" })}
                        />
                        Hint
                      </label>
                      <input
                        className="field-input flex-1 min-w-[140px]"
                        value={a.hint}
                        disabled={a.mode !== "hint"}
                        onChange={(e) =>
                          updateAlternate(i, ai, { hint: e.target.value })
                        }
                        placeholder="hint shown"
                      />
                      <button
                        type="button"
                        onClick={() => removeAlternate(i, ai)}
                        className="text-stamp text-sm px-2"
                        aria-label="Remove alternate"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addAlternate(i)}
                  className="text-sm text-teal hover:underline"
                >
                  + Add alternate answer
                </button>
              </div>
            ))}
            <button type="button" onClick={addClue} className="stamp teal text-xs">
              + Add Clue
            </button>
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
