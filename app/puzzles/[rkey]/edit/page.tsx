import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAtpClient } from "@/lib/atproto/client";
import { decryptAnswerKey } from "@/lib/crypto/answerBlock";
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
      const answerKey = decryptAnswerKey(clue.answerBlock);
      return {
        id: clue.id,
        name: clue.name,
        prompt: clue.prompt,
        canonical: answerKey.canonical,
        accepted: answerKey.accepted,
      };
    }),
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <h1 className="font-display font-800 italic text-2xl mb-4">
        Edit puzzle
      </h1>

      <PuzzleForm initialValues={initialValues} />
    </div>
  );
}
