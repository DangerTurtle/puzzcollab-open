import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { PuzzleForm } from "@/components/PuzzleForm";

export default async function NewPuzzlePage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <h1 className="font-display font-800 italic text-2xl mb-4">
        New puzzle
      </h1>

      <PuzzleForm />
    </div>
  );
}
