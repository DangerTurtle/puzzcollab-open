import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveToggles } from "./frontmatter";
import { PFMD_DEFAULTS, MD_DEFAULTS } from "./types";

test("no frontmatter falls back to the format's defaults", () => {
  const { toggles, content } = resolveToggles("just a body", "pfmd");
  assert.deepEqual(toggles, PFMD_DEFAULTS);
  assert.equal(content, "just a body");

  const md = resolveToggles("just a body", "md");
  assert.deepEqual(md.toggles, MD_DEFAULTS);
});

test("frontmatter is stripped from the returned content", () => {
  const { content } = resolveToggles("---\ncolumns: false\n---\nbody text", "pfmd");
  assert.equal(content, "body text");
});

test("boolean overrides in frontmatter apply on top of the format default", () => {
  const { toggles } = resolveToggles(
    "---\nanswer_tags: false\n---\nbody",
    "pfmd",
  );
  assert.equal(toggles.answerTags, false);
  assert.equal(toggles.columns, true);
});

test("an md-format doc can opt in to individual extensions", () => {
  const { toggles } = resolveToggles(
    "---\nliteral_underscores: true\n---\nbody",
    "md",
  );
  assert.equal(toggles.literalUnderscores, true);
  assert.equal(toggles.answerTags, false);
});

test("non-boolean override values are ignored, defaults are kept", () => {
  const { toggles } = resolveToggles(
    "---\ncolumns: \"yes please\"\n---\nbody",
    "pfmd",
  );
  assert.equal(toggles.columns, true);
});

test("malformed YAML frontmatter falls back to defaults but still strips the block", () => {
  const { toggles, content } = resolveToggles(
    "---\n: not: valid: yaml:\n---\nbody",
    "pfmd",
  );
  assert.deepEqual(toggles, PFMD_DEFAULTS);
  assert.equal(content, "body");
});
