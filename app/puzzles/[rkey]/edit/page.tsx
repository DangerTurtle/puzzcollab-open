import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getAtpClient } from "@/lib/atproto/client";
import { decryptAnswerKeySafe } from "@/lib/crypto/answerBlock";
import * as us from "@/lib/lexicons/us";
import { PuzzleForm, type PuzzleFormInitialValues } from "@/components/PuzzleForm";

export default async function EditPuzzlePage({
  params,
}: {
  params: Promise<{ rkey: string }>;
}) {
  const { rkey } = await params;
  const session = await getSession();
  if (!session) redirect("/");

  const client = getAtpClient(session);
  let record;
  try {
    record = await client.get(us.puzzling.puzzle.main, {
      repo: session.did,
      rkey,
    });
  } catch {
    notFound();
  }

  const initialValues: PuzzleFormInitialValues = {
    rkey,
    createdAt: record.value.createdAt,
    title: record.value.title,
    body: record.value.body,
    publishAt: record.value.publishAt ?? "",
    clues: record.value.clues.map((clue) => {
      const answerKey = decryptAnswerKeySafe(clue.answerBlock);
      return {
        id: clue.id,
        name: clue.name,
        prompt: clue.prompt,
        canonical: answerKey.canonical,
        alternates: answerKey.accepted.map((a) => ({
          match: a.match,
          mode: a.hint ? ("hint" as const) : ("accept" as const),
          hint: a.hint ?? "",
        })),
      };
    }),
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-800 italic text-2xl">
          Edit puzzle
        </h1>
        {/*
          Static preview for now -- fetches the saved record, same as any
          other solver-view visit. A live WYSIWYG preview (updating as you
          type, before saving) would need this link to open in a mode that
          skips the fetch and instead listens for draft state broadcast from
          this tab via BroadcastChannel, with the solver page doing its own
          client-side verdict check instead of calling submitAttempt -- so
          a preview guess never gets written as a real attempt record. See
          chat for the fuller design note; not built yet.
        */}
        <Link
          href={`/solve/${session.did}/${rkey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="stamp teal text-xs"
        >
          Preview in Solver View
        </Link>
      </div>

      <PuzzleForm initialValues={initialValues} />
    </div>
  );
}
