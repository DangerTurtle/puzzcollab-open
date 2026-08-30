"use client";

import { useState, useTransition } from "react";
import { savePuzzle, type ClueInput, type PuzzleFormInput } from "@/app/puzzles/actions";
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
    accepted: [],
  };
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

  const [clues, setClues] = useState<ClueInput[]>(
    initialValues?.clues?.length ? initialValues.clues : [newClue(0)],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateClue(index: number, patch: Partial<ClueInput>) {
    setClues((cs) => cs.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addClue() {
    setClues((cs) => [...cs, newClue(cs.length)]);
  }

  function removeClue(index: number) {
    setClues((cs) => cs.filter((_, i) => i !== index));
  }

  function addAccepted(clueIndex: number) {
    updateClue(clueIndex, {
      accepted: [...clues[clueIndex].accepted, { match: "", hint: "" }],
    });
  }

  function updateAccepted(
    clueIndex: number,
    acceptedIndex: number,
    patch: Partial<{ match: string; hint: string }>,
  ) {
    const accepted = clues[clueIndex].accepted.map((a, i) =>
      i === acceptedIndex ? { ...a, ...patch } : a,
    );
    updateClue(clueIndex, { accepted });
  }

  function removeAccepted(clueIndex: number, acceptedIndex: number) {
    updateClue(clueIndex, {
      accepted: clues[clueIndex].accepted.filter((_, i) => i !== acceptedIndex),
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
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <div className="flex items-center justify-between mb-3">
            <div className="section-label">Clues</div>
            <button type="button" onClick={addClue} className="stamp teal text-xs">
              + Add Clue
            </button>
          </div>
          <div className="space-y-4 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-2">
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
                  {clues.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeClue(i)}
                      className="text-sm text-stamp hover:underline mt-6"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label className="field-label">Prompt</label>
                <textarea
                  className="field-input mb-4"
                  rows={2}
                  value={clue.prompt}
                  onChange={(e) => updateClue(i, { prompt: e.target.value })}
                  required
                />

                <label className="field-label">Canonical answer</label>
                <input
                  className="field-input mb-4"
                  value={clue.canonical}
                  onChange={(e) => updateClue(i, { canonical: e.target.value })}
                  required
                />

                <label className="field-label">Also accept</label>
                <div className="space-y-2 mb-2">
                  {clue.accepted.map((a, ai) => (
                    <div key={ai} className="flex gap-2">
                      <input
                        className="field-input"
                        value={a.match}
                        onChange={(e) =>
                          updateAccepted(i, ai, { match: e.target.value })
                        }
                        placeholder="alternate answer"
                      />
                      <input
                        className="field-input"
                        value={a.hint ?? ""}
                        onChange={(e) =>
                          updateAccepted(i, ai, { hint: e.target.value })
                        }
                        placeholder="hint shown for this alternate (optional)"
                      />
                      <button
                        type="button"
                        onClick={() => removeAccepted(i, ai)}
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
                  onClick={() => addAccepted(i)}
                  className="text-sm text-teal hover:underline"
                >
                  + Add alternate answer
                </button>
              </div>
            ))}
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
