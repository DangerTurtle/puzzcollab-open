import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/LoginForm";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/puzzles");

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <main className="w-full max-w-sm">
        <p className="text-ink-soft italic text-center mb-6">
          Sign in to author puzzles.
        </p>

        <div className="card">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
