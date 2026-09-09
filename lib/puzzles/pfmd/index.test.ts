import { test } from "node:test";
import assert from "node:assert/strict";
import type { Element } from "hast";
import { pfmdToHast } from "./index";

function findAll(node: unknown, tagName: string, out: Element[] = []): Element[] {
  if (!node || typeof node !== "object") return out;
  const n = node as Element & { children?: unknown[] };
  if (n.type === "element" && n.tagName === tagName) out.push(n);
  for (const child of n.children ?? []) findAll(child, tagName, out);
  return out;
}

test("an answer tag becomes a pzl-answer element carrying the name", () => {
  const { tree, errors } = pfmdToHast("{5}(SAMPLE)", "pfmd");
  assert.deepEqual(errors, []);
  const [answer] = findAll(tree, "pzl-answer");
  assert.equal(answer.properties?.dataAnswerName, "SAMPLE");
  assert.equal(findAll(answer, "span").length, 5);
});

test("a leading ! hides the enumeration but keeps the tag", () => {
  const { tree } = pfmdToHast("!{5}(SAMPLE)", "pfmd");
  const [answer] = findAll(tree, "pzl-answer");
  assert.equal(answer.properties?.dataAnswerName, "SAMPLE");
  assert.deepEqual(answer.children, []);
});

test("an explicit empty enumeration renders with no blanks and no error", () => {
  const { tree, errors } = pfmdToHast("{}(SAMPLE)", "pfmd");
  assert.deepEqual(errors, []);
  const [answer] = findAll(tree, "pzl-answer");
  assert.deepEqual(answer.children, []);
});

test("a malformed enumeration degrades to hidden and is reported as an error", () => {
  // @0 has no valid (positive) highlight index -- malformed. (A raw
  // backslash won't do here as a malformed-input fixture: CommonMark's own
  // inline parser resolves backslash-escaped punctuation, including "}",
  // before our answer-tag regex ever sees the text.)
  const { tree, errors } = pfmdToHast("{5@0}(SAMPLE)", "pfmd");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].kind, "malformed-enumeration");
  const [answer] = findAll(tree, "pzl-answer");
  assert.equal(answer.properties?.dataAnswerName, "SAMPLE");
  assert.deepEqual(answer.children, []);
});

test("answer tags are disabled by default for md format", () => {
  const { tree, errors } = pfmdToHast("{5}(SAMPLE)", "md");
  assert.deepEqual(errors, []);
  assert.equal(findAll(tree, "pzl-answer").length, 0);
});

test("consecutive blockquote columns are grouped into one pzl-columns wrapper", () => {
  const body = "> left\n\n>> center\n\n>>> right";
  const { tree } = pfmdToHast(body, "pfmd");
  const wrappers = findAll(tree, "div").filter((el) =>
    (el.properties?.className as string[] | undefined)?.includes("pzl-columns"),
  );
  assert.equal(wrappers.length, 1);
  const columns = findAll(wrappers[0], "div").filter((el) =>
    (el.properties?.className as string[] | undefined)?.includes("pzl-column"),
  );
  assert.equal(columns.length, 3);
  const classes = columns.map((c) => (c.properties?.className as string[]).join(" "));
  assert.deepEqual(classes, [
    "pzl-column pzl-column-left",
    "pzl-column pzl-column-center",
    "pzl-column pzl-column-right",
  ]);
});

test("a blockquote separated by an intervening paragraph starts a new group", () => {
  const body = "> left one\n\nbreak\n\n> left two";
  const { tree } = pfmdToHast(body, "pfmd");
  const wrappers = findAll(tree, "div").filter((el) =>
    (el.properties?.className as string[] | undefined)?.includes("pzl-columns"),
  );
  assert.equal(wrappers.length, 2);
});

test("columns are disabled by default for md format (renders as a real blockquote)", () => {
  const { tree } = pfmdToHast("> quoted", "md");
  assert.equal(findAll(tree, "blockquote").length, 1);
  assert.equal(findAll(tree, "div").length, 0);
});

test("code fences are not subject to literal escaping or answer-tag parsing", () => {
  const body = "```\n{5}(NOT_AN_ANSWER) foo_bar [x]\n```";
  const { tree } = pfmdToHast(body, "pfmd");
  assert.equal(findAll(tree, "pzl-answer").length, 0);
  const [code] = findAll(tree, "code");
  assert.equal((code.children[0] as { value: string }).value, "{5}(NOT_AN_ANSWER) foo_bar [x]\n");
});

test("a plain trailing line becomes a hard break, a backslash-preceded one a soft break", () => {
  const body = "one\ntwo\\\nthree";
  const { tree } = pfmdToHast(body, "pfmd");
  assert.equal(findAll(tree, "br").length, 1);
});

test("frontmatter toggles are honored end to end", () => {
  const body = "---\nanswer_tags: false\n---\n{5}(SAMPLE)";
  const { tree } = pfmdToHast(body, "pfmd");
  assert.equal(findAll(tree, "pzl-answer").length, 0);
});
