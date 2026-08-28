import { getSession } from "@/lib/auth/session";
import { getAccountHandle } from "@/lib/db/queries";
import { LoginForm } from "@/components/LoginForm";
import { LogoutButton } from "@/components/LogoutButton";

export default async function Home() {
  const session = await getSession();
  const accountHandle = session ? await getAccountHandle(session.did) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="w-full max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            puzzling.us
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Under construction -- teams and puzzles aren&apos;t wired up yet.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          {session ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Signed in as @{accountHandle ?? session.did}
              </p>
              <LogoutButton />
            </div>
          ) : (
            <LoginForm />
          )}
        </div>
      </main>
    </div>
  );
}
