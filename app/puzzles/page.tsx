import Link from "next/link";
import { redirect } from "next/navigation";
import { AtUri } from "@atproto/syntax";
import { getSession } from "@/lib/auth/session";
import { getAtpClient } from "@/lib/atproto/client";
import * as us from "@/lib/lexicons/us";

export default async function PuzzlesPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const client = getAtpClient(session);
  const { records } = await client.list(us.puzzling.puzzle.main, {
    repo: session.did,
    limit: 100,
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="section-label mb-2">Puzzle Authoring</div>
          <h1 className="font-display font-800 italic text-3xl">
            Your puzzles
          </h1>
        </div>
        <Link href="/puzzles/new" className="stamp red">
          New Puzzle
        </Link>
      </div>

      {records.length === 0 ? (
        <p className="text-ink-soft italic">
          No puzzles yet. Start your first one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {records.map((r) => {
            const rkey = new AtUri(r.uri).rkey;
            const title = r.valid ? r.value.title : "(invalid record)";
            const clueCount = r.valid ? r.value.clues.length : 0;
            const publishAt = r.valid ? r.value.publishAt : undefined;
            return (
              <div key={r.uri} className="card">
                <Link href={`/puzzles/${rkey}/edit`} className="block hover:-translate-y-0.5 transition-transform">
                  <h3 className="font-display font-600 italic text-xl mb-2">
                    {title}
                  </h3>
                  <p className="text-sm text-ink-soft">
                    {clueCount} {clueCount === 1 ? "clue" : "clues"}
                  </p>
                  {publishAt && (
                    <p className="text-sm text-ink-soft mt-1">
                      Publishes {new Date(publishAt).toLocaleString()}
                    </p>
                  )}
                </Link>
                <Link
                  href={`/solve/${session.did}/${rkey}`}
                  className="text-sm text-teal hover:underline mt-3 inline-block"
                >
                  Open solver view &rarr;
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
