export interface PfmdError {
  /**
   * "malformed-enumeration": the `{...}` content couldn't be parsed as a
   * valid IPUZ-style enumeration. Detected here in stage 1 because it's a
   * pure syntax question about body text. ("unresolvable-tag" -- a name
   * that doesn't match any real answer -- can't be detected here, since
   * this stage never sees the decrypted answer key; that's stage 2's job.)
   */
  kind: "malformed-enumeration";
  /** The raw literal text that failed to parse, for author-facing error display. */
  detail: string;
}

export interface ExtensionToggles {
  answerTags: boolean;
  columns: boolean;
  literalBrackets: boolean;
  literalUnderscores: boolean;
  literalLineBreaks: boolean;
}

export type PuzzleFormat = "pfmd" | "md";

// PFMD (.pfmd-equivalent) ships with every extension on; plain markdown
// (.md-equivalent) ships with every extension off, opt-in via frontmatter.
// See docs/puzzle-flavored-markdown.md's Metadata section.
export const PFMD_DEFAULTS: ExtensionToggles = {
  answerTags: true,
  columns: true,
  literalBrackets: true,
  literalUnderscores: true,
  literalLineBreaks: true,
};

export const MD_DEFAULTS: ExtensionToggles = {
  answerTags: false,
  columns: false,
  literalBrackets: false,
  literalUnderscores: false,
  literalLineBreaks: false,
};
