import { notFound, redirect } from "next/navigation";
import { asAtIdentifierString } from "@atproto/syntax";
import { getSession } from "@/lib/auth/session";
import { getAtpClient } from "@/lib/atproto/client";
import { getAccountHandle } from "@/lib/db/queries";
import { decryptAnswerKeySafe } from "@/lib/crypto/answerBlock";
import { checkAnswer } from "@/lib/puzzles/verdict";
import * as us from "@/lib/lexicons/us";
import { SolverView, type SolverClue } from "@/components/SolverView";

export default async function SolvePuzzlePage({
  params,
}: {
  params: Promise<{ did: string; rkey: string }>;
}) {
  const raw = await params;
  // Link's href resolution percent-encodes colons in dynamic segments (so
  // "did:plc:xxx" arrives as "did%3Aplc%3Axxx"); Next doesn't decode route
  // params back out, so it has to happen here. decodeURIComponent is a
  // no-op on an already-plain string, so this is safe either way.
  const did = decodeURIComponent(raw.did);
  const rkey = decodeURIComponent(raw.rkey);
  const session = await getSession();
  if (!session) redirect("/");

  const client = getAtpClient(session);
  let puzzle;
  try {
    puzzle = await client.get(us.puzzling.puzzle.main, {
      repo: asAtIdentifierString(did),
      rkey,
    });
  } catch (err) {
    console.error(`solve page: failed to load puzzle at://${did}/us.puzzling.puzzle/${rkey}`, err);
    notFound();
  }

  const isAuthor = session.did === did;
  const viewerHandle = (await getAccountHandle(session.did)) ?? session.did;

  // Only the viewer's own attempts are visible today -- there's no
  // cross-account index yet (that needs Tap plus a real team/roster model,
  // neither of which exist yet). So "solved" here means "I solved it."
  const myAttempts: { clueId: string; text: string; createdAt: string }[] = [];
  try {
    const { records } = await client.list(us.puzzling.attempt.main, {
      repo: session.did,
      limit: 100,
    });
    for (const r of records) {
      if (r.valid && r.value.puzzle.uri === puzzle.uri) {
        myAttempts.push({
          clueId: r.value.clueId,
          text: r.value.text,
          createdAt: r.value.createdAt,
        });
      }
    }
  } catch {
    // No attempts yet, or listing failed -- treat as none.
  }

  const clues: SolverClue[] = puzzle.value.clues.map((clue) => {
    const answerKey = decryptAnswerKeySafe(clue.answerBlock);
    const correctAttempt = myAttempts
      .filter((a) => a.clueId === clue.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .find((a) => checkAnswer(a.text, answerKey).correct);

    return {
      id: clue.id,
      name: clue.name,
      prompt: clue.prompt,
      solved: correctAttempt
        ? {
            canonical: answerKey.canonical,
            solverHandle: viewerHandle,
            solvedAt: correctAttempt.createdAt,
          }
        : null,
    };
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <SolverView
        authorDid={did}
        rkey={rkey}
        title={puzzle.value.title}
        body={puzzle.value.body}
        clues={clues}
        isAuthor={isAuthor}
        viewerHandle={viewerHandle}
      />
    </div>
  );
}
