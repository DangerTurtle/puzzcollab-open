import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnumeration } from "./enumeration";

test("parses a simple numeric enumeration into blanks per word", () => {
  const parsed = parseEnumeration("5,3");
  assert.equal(parsed?.wordCount, 2);
  assert.equal(parsed?.words.length, 2);
  assert.equal(parsed?.words[0].length, 5);
  assert.equal(parsed?.words[1].length, 3);
  assert.ok(parsed?.words[0].every((t) => t.kind === "blank" && !t.unspecified));
});

test("0 means an unspecified-length blank", () => {
  const parsed = parseEnumeration("0");
  assert.equal(parsed?.words.length, 1);
  assert.equal(parsed?.words[0].length, 1);
  assert.equal(parsed?.words[0][0].unspecified, true);
});

test("literal punctuation passes through as literal tokens", () => {
  const parsed = parseEnumeration("3-2");
  assert.equal(parsed?.words.length, 1);
  const kinds = parsed?.words[0].map((t) => t.kind);
  assert.deepEqual(kinds, ["blank", "blank", "blank", "literal", "blank", "blank"]);
});

test("backslash and backtick escapes force the next char to be literal", () => {
  const parsed = parseEnumeration("\\5`0");
  assert.deepEqual(parsed?.words[0], [
    { kind: "literal", char: "5" },
    { kind: "literal", char: "0" },
  ]);
});

test("typographic hint chars (* ^ +) are consumed with no semantic effect", () => {
  const parsed = parseEnumeration("*3^+");
  assert.equal(parsed?.words[0].length, 3);
  assert.ok(parsed?.words[0].every((t) => t.kind === "blank"));
});

test("trailing ;N overrides the reported word count without changing blanks", () => {
  const parsed = parseEnumeration("5;3");
  assert.equal(parsed?.words.length, 1);
  assert.equal(parsed?.wordCount, 3);
});

test("trailing @N,M highlights the Nth/Mth blank across the whole enumeration", () => {
  const parsed = parseEnumeration("2,3@2,4");
  assert.equal(parsed?.words[0][1].highlighted, true);
  assert.equal(parsed?.words[0][0].highlighted, undefined);
  assert.equal(parsed?.words[1][1].highlighted, true);
  assert.equal(parsed?.words[1][0].highlighted, undefined);
});

test("empty enumeration content parses to zero words (explicit empty tag)", () => {
  const parsed = parseEnumeration("");
  assert.deepEqual(parsed, { words: [], wordCount: 0 });
});

test("a dangling escape character is malformed", () => {
  assert.equal(parseEnumeration("5\\"), null);
});

test("an @ suffix with no valid (positive) indices is malformed", () => {
  assert.equal(parseEnumeration("5@0"), null);
});

test("content that is only a highlight/word-count suffix is malformed", () => {
  assert.equal(parseEnumeration(";3"), null);
  assert.equal(parseEnumeration("@1"), null);
});
