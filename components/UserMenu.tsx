"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function UserMenu({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await fetch("/oauth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="font-mono text-xs uppercase tracking-wider text-ink-soft hover:text-ink flex items-center gap-1.5"
      >
        {label}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 min-w-[140px] border-2 border-ink bg-paper-card z-10">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-stamp hover:bg-white"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
