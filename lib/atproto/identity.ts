import { getHandle, type DidDocument } from "@atproto/common-web";

// Resolves a DID to its handle directly (PLC directory / did:web well-known
// doc), independent of Tap. Puzzle authoring talks straight to a user's own
// PDS and shouldn't need Tap running just to show "@handle" in the header.
export async function resolveHandle(did: string): Promise<string | null> {
  try {
    const url = did.startsWith("did:web:")
      ? `https://${decodeURIComponent(did.slice("did:web:".length))}/.well-known/did.json`
      : `https://plc.directory/${did}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const doc = (await res.json()) as DidDocument;
    return getHandle(doc) ?? null;
  } catch {
    return null;
  }
}
