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

test("a closing fence shorter than the opening one doesn't close it", () => {
  // Regression: a 4-backtick fence containing a 3-backtick line (e.g. a
  // markdown code sample as the *content* of the outer fence) must not be
  // treated as closed by that shorter run.
  const source = ["````", "```text", "foo_bar", "````"].join("\n");
  const out = applyLiteralPreprocessing(source, PFMD_DEFAULTS);
  assert.equal(out, source);
});

test("a fence-marker line with trailing content doesn't close the fence", () => {
  // e.g. an info string that happens to start with the same char run --
  // real CommonMark closing fences permit only trailing whitespace.
  const source = ["```", "```not-actually-closing", "foo_bar", "```"].join("\n");
  const out = applyLiteralPreprocessing(source, PFMD_DEFAULTS);
  assert.equal(out, source);
});

test("a code span that crosses a line break is left untouched on both lines", () => {
  // Regression: per-line code-span detection couldn't see that
  // `foo_bar\nbaz[x]` is one unterminated span until the closing backtick
  // on the second line, so it used to escape the underscore/bracket inside.
  const source = "before `foo_bar\nbaz[x]` after";
  const out = applyLiteralPreprocessing(source, PFMD_DEFAULTS);
  assert.equal(out, "before `foo_bar\nbaz[x]` after");
});

test("a line break inside an open multiline code span isn't rewritten as a hard break", () => {
  const source = "`foo\nbar` baz";
  const out = applyLiteralPreprocessing(source, PFMD_DEFAULTS);
  // Not "foo  \nbar" -- the break is literal code-span content, not prose.
  assert.equal(out, "`foo\nbar` baz");
});

test("CRLF blank lines are recognized as paragraph boundaries", () => {
  // Regression: splitting only on "\n" left a trailing "\r" on the blank
  // line, so it read as non-blank and got a hard-break suffix appended,
  // merging what should be two separate paragraphs.
  const out = applyLiteralPreprocessing("para one\r\n\r\npara two", PFMD_DEFAULTS);
  assert.equal(out, "para one\n\npara two");
});
