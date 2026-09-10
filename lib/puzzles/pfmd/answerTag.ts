import { findAndReplace } from "mdast-util-find-and-replace";
import type { Root, PhrasingContent } from "mdast";
import { parseEnumeration } from "./enumeration";
import type { PfmdError } from "./types";

/**
 * A custom mdast node for `{enum}(name)` answer tags -- not a standard
 * mdast/hast type, so it needs an explicit `remark-rehype` handler (see
 * index.ts) to become the real `pzl-answer` element. Carrying the parsed
 * enumeration (rather than raw text) through to that handler keeps the
 * parsing logic in one place (enumeration.ts).
 */
export interface PzlAnswerTagNode {
  type: "pzlAnswerTag";
  answerName: string;
  /** True when the enumeration should not be shown pre-solve (author wrote
   * "!", left it empty, or it was malformed and we degraded to hidden). */
  hidden: boolean;
  enumeration: ReturnType<typeof parseEnumeration>;
}

// Matches: {enumeration}(name)  or  !{enumeration}(name)
// The enumeration and name bodies are captured permissively (anything but
// the tag's own delimiters) so that a malformed *inner* enumeration still
// lets us recover the outer tag boundary and the answer name -- see the
// "lenient outer / strict inner" design in
// docs/puzzle-flavored-markdown.md's Answer Tags section. Only a pattern
// that doesn't match this regex *at all* (e.g. unbalanced braces/parens)
// falls through as literal text, uncounted as covering any answer.
const ANSWER_TAG_RE = /(!)?\{([^{}]*)\}\(([^()]+)\)/g;

/**
 * Finds `{...}(...)` answer tags in text nodes and replaces them with
 * `pzlAnswerTag` nodes. Mutates `tree` in place; appends to `errors` for
 * any enumeration that couldn't be parsed (see parseEnumeration).
 */
export function transformAnswerTags(tree: Root, errors: PfmdError[]): void {
  findAndReplace(tree, [
    [
      ANSWER_TAG_RE,
      (
        _match: string,
        bang: string | undefined,
        enumRaw: string,
        name: string,
      ): PhrasingContent => {
        const authorHid = Boolean(bang) || enumRaw.trim() === "";
        let enumeration = null;

        if (!authorHid) {
          enumeration = parseEnumeration(enumRaw);
          if (enumeration === null) {
            // Outer tag structure (braces + name) parsed fine; only the
            // enumeration content inside didn't. Degrade to the same
            // behavior as an author-written "!" -- still a valid, covered
            // answer tag, just nothing shown pre-solve -- rather than
            // dropping the tag. Logged so solver-view error reporting
            // (when enabled) can point the author at the bad literal.
            errors.push({ kind: "malformed-enumeration", detail: enumRaw });
          }
        }

        const node: PzlAnswerTagNode = {
          type: "pzlAnswerTag",
          answerName: name.trim(),
          hidden: authorHid || enumeration === null,
          enumeration,
        };
        return node as unknown as PhrasingContent;
      },
    ],
  ]);
}
