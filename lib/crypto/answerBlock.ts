import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// answers is opaque at the lexicon level (see puzzling.puzzle.json) so the
// AppView -- and only the AppView -- can decrypt it to check attempts.
// AES-256-GCM with a server-held key: the key never reaches the browser, so
// a puzzle's answers block stays meaningless to anyone reading the public
// atproto record directly (which anyone can, since records are public
// regardless of team boundaries).
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface Answer {
  id: string;
  name: string;
  canonical: string;
  alternates: string[];
}

// Not tied to a specific answer -- an arbitrary near-miss string that
// surfaces message to the solver without counting as solved. Whatever is
// visible about an answer before it's given (prompts, clue text) lives in
// the puzzle body instead, not here.
export interface Hint {
  match: string;
  message: string;
}

export interface AnswerKey {
  answers: Answer[];
  hints: Hint[];
}

function getKey(): Buffer {
  const secret = process.env.ANSWER_KEY_SECRET;
  if (!secret) {
    throw new Error(
      "ANSWER_KEY_SECRET is not set -- required to encrypt/decrypt puzzle answer keys.",
    );
  }
  // Hashed rather than required to be exactly 32 bytes/base64 -- any secret
  // string works, matching how the other dev secrets in .env are configured.
  return createHash("sha256").update(secret).digest();
}

export function encryptAnswerKey(answerKey: AnswerKey): Uint8Array {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(answerKey), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return new Uint8Array(Buffer.concat([iv, authTag, ciphertext]));
}

export function decryptAnswerKey(answersBlock: Uint8Array): AnswerKey {
  const buf = Buffer.from(answersBlock);
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8"));
}

export const CORRUPTED_ANSWER_SENTINEL = "<<ANSWER DATA CORRUPTED>>";

// A bad answers block (wrong/rotated ANSWER_KEY_SECRET, bit rot, a record
// written by something else entirely) throws out of decryptAnswerKey.
// That's correct for anything that needs the real answers, but callers that
// just need to render *something* instead of taking the whole page down can
// use this instead. Falls back to an empty answer key rather than a
// per-field sentinel now that there's one blob for the whole puzzle instead
// of one per clue -- callers that want to surface CORRUPTED_ANSWER_SENTINEL
// to an author should check for the empty-but-should-not-be-empty case
// themselves.
export function decryptAnswerKeySafe(answersBlock: Uint8Array): AnswerKey {
  try {
    return decryptAnswerKey(answersBlock);
  } catch {
    return { answers: [], hints: [] };
  }
}
