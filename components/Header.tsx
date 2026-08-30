import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getAccountHandle } from "@/lib/db/queries";
import { Wordmark } from "./Wordmark";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const session = await getSession();
  const accountHandle = session ? await getAccountHandle(session.did) : null;

  return (
    <header className="border-b-[3px] border-ink">
      <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
        <Link href={session ? "/puzzles" : "/"}>
          <Wordmark />
        </Link>
        {session ? (
          <UserMenu label={accountHandle ? `@${accountHandle}` : session.did} />
        ) : (
          <Link href="/" className="stamp red">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
