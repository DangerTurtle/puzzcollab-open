import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// answerBlock is opaque at the lexicon level (see puzzling.puzzle.json's #clue
// def) so the AppView -- and only the AppView -- can decrypt it to check
// attempts. AES-256-GCM with a server-held key: the key never reaches the
// browser, so a puzzle's answerBlock stays meaningless to anyone reading the
// public atproto record directly (which anyone can, since records are public
// regardless of team boundaries).
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface AnswerMatch {
  match: string;
  hint?: string;
}

export interface AnswerKey {
  canonical: string;
  accepted: AnswerMatch[];
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

export function decryptAnswerKey(answerBlock: Uint8Array): AnswerKey {
  const buf = Buffer.from(answerBlock);
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

// A bad answerBlock (wrong/rotated ANSWER_KEY_SECRET, bit rot, a record
// written by something else entirely) throws out of decryptAnswerKey.
// That's correct for anything that needs the real answer, but the puzzle
// editor just needs to render *a* value for that clue instead of taking the
// whole page down -- surfacing the sentinel in the editable field lets the
// author notice and retype it.
export function decryptAnswerKeySafe(answerBlock: Uint8Array): AnswerKey {
  try {
    return decryptAnswerKey(answerBlock);
  } catch {
    return { canonical: CORRUPTED_ANSWER_SENTINEL, accepted: [] };
  }
}
