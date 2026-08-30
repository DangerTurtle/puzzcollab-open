"use client";

import { useState } from "react";

export function LoginForm() {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/oauth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Redirect to authorization server
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="handle">
          Bluesky handle
        </label>
        <input
          id="handle"
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="alice.bsky.social"
          className="field-input"
          disabled={loading}
        />
      </div>

      {error && <p className="text-stamp text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !handle}
        className="stamp red w-full justify-center"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
