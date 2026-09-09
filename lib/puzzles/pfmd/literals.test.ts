import { test } from "node:test";
import assert from "node:assert/strict";
import { applyLiteralPreprocessing } from "./literals";
import { PFMD_DEFAULTS, MD_DEFAULTS } from "./types";

test("escapes brackets and underscores outside code", () => {
  // Single line, so there's no next line for a break rewrite to apply to.
  const out = applyLiteralPreprocessing("foo_bar [baz]", PFMD_DEFAULTS);
  assert.equal(out, "foo\\_bar \\[baz\\]");
});

test("leaves inline code spans untouched", () => {
  const out = applyLiteralPreprocessing("text `foo_bar[x]` more", PFMD_DEFAULTS);
  assert.ok(out.startsWith("text `foo_bar[x]` more"));
});

test("leaves fenced code blocks untouched, including the fence markers", () => {
  const source = ["```", "foo_bar [baz]", "```"].join("\n");
  const out = applyLiteralPreprocessing(source, PFMD_DEFAULTS);
  assert.equal(out, source);
});

test("a plain line break is turned into a forced hard break", () => {
  const out = applyLiteralPreprocessing("line one\nline two", PFMD_DEFAULTS);
  assert.equal(out, "line one  \nline two");
});

test("a backslash-preceded line break has the backslash stripped (soft break)", () => {
  const out = applyLiteralPreprocessing("line one\\\nline two", PFMD_DEFAULTS);
  assert.equal(out, "line one\nline two");
});

test("line breaks at paragraph boundaries (blank lines) are left alone", () => {
  const out = applyLiteralPreprocessing("para one\n\npara two", PFMD_DEFAULTS);
  assert.equal(out, "para one\n\npara two");
});

test("all toggles off is a no-op", () => {
  const source = "foo_bar [baz]\nnext line";
  assert.equal(applyLiteralPreprocessing(source, MD_DEFAULTS), source);
});

test("individual toggles apply independently", () => {
  const toggles = { ...MD_DEFAULTS, literalUnderscores: true };
  const out = applyLiteralPreprocessing("foo_bar [baz]", toggles);
  assert.equal(out, "foo\\_bar [baz]");
});
