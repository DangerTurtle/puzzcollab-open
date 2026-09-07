import { notFound, redirect } from "next/navigation";
import { asAtIdentifierString } from "@atproto/syntax";
import { getSession } from "@/lib/auth/session";
import { getAtpClient } from "@/lib/atproto/client";
import { getAccountHandle } from "@/lib/db/queries";
import { decryptAnswerKeySafe } from "@/lib/crypto/answerBlock";
import { checkSubmission } from "@/lib/puzzles/verdict";
import * as us from "@/lib/lexicons/us";
import { SolverView, type SolvedAnswer } from "@/components/SolverView";

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
  const [viewerHandle, authorHandle] = await Promise.all([
    getAccountHandle(session.did),
    getAccountHandle(did),
  ]);

  // Only the viewer's own attempts are visible today -- there's no
  // cross-account index yet (that needs Tap plus a real team/roster model,
  // neither of which exist yet). So "solved" here means "I solved it."
  const myAttempts: { text: string; createdAt: string }[] = [];
  try {
    const { records } = await client.list(us.puzzling.attempt.main, {
      repo: session.did,
      limit: 100,
    });
    for (const r of records) {
      if (r.valid && r.value.puzzle.uri === puzzle.uri) {
        myAttempts.push({ text: r.value.text, createdAt: r.value.createdAt });
      }
    }
  } catch {
    // No attempts yet, or listing failed -- treat as none.
  }
  myAttempts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const answerKey = decryptAnswerKeySafe(puzzle.value.answers);

  // For each of the viewer's attempts (earliest first), check it against
  // the whole pool and record the first correct attempt per answer --
  // that's "when I solved it".
  const solved = new Map<string, SolvedAnswer>();
  for (const attempt of myAttempts) {
    const verdict = checkSubmission(attempt.text, answerKey);
    if (verdict.correct && !solved.has(verdict.answer.id)) {
      solved.set(verdict.answer.id, {
        id: verdict.answer.id,
        name: verdict.answer.name,
        canonical: verdict.answer.canonical,
        solverHandle: viewerHandle ?? session.did,
        solvedAt: attempt.createdAt,
      });
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <SolverView
        authorDid={did}
        rkey={rkey}
        title={puzzle.value.title}
        authorHandle={authorHandle ?? did}
        body={puzzle.value.body}
        solved={Array.from(solved.values())}
        isAuthor={isAuthor}
        viewerHandle={viewerHandle ?? session.did}
      />
    </div>
  );
}
