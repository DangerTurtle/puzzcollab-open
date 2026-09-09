import yaml from "js-yaml";
import { PFMD_DEFAULTS, MD_DEFAULTS } from "./types";
import type { ExtensionToggles, PuzzleFormat } from "./types";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const TOGGLE_KEYS: Record<string, keyof ExtensionToggles> = {
  answer_tags: "answerTags",
  columns: "columns",
  literal_brackets: "literalBrackets",
  literal_underscores: "literalUnderscores",
  literal_line_breaks: "literalLineBreaks",
};

/**
 * Strips a leading YAML frontmatter block (fenced by `---` lines) and
 * resolves the extension-toggle set: format-based defaults, overridden by
 * whatever booleans the frontmatter sets. Never throws -- frontmatter is
 * author-controlled text like everything else in `body`, and a typo in a
 * puzzle's frontmatter shouldn't take the whole render down. Malformed YAML
 * falls back to the format defaults (frontmatter block is still stripped
 * either way, so it never leaks into visible body text).
 */
export function resolveToggles(
  body: string,
  format: PuzzleFormat,
): { toggles: ExtensionToggles; content: string } {
  const defaults = format === "pfmd" ? PFMD_DEFAULTS : MD_DEFAULTS;
  const match = body.match(FRONTMATTER_RE);
  if (!match) return { toggles: defaults, content: body };

  const content = body.slice(match[0].length);

  let parsed: unknown;
  try {
    parsed = yaml.load(match[1]);
  } catch {
    return { toggles: defaults, content };
  }

  const overrides =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  const toggles: ExtensionToggles = { ...defaults };
  for (const [yamlKey, toggleKey] of Object.entries(TOGGLE_KEYS)) {
    const value = overrides[yamlKey];
    if (typeof value === "boolean") toggles[toggleKey] = value;
  }

  return { toggles, content };
}
