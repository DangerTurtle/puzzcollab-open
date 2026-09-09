import type { ElementContent } from "hast";

export interface EnumerationToken {
  kind: "blank" | "literal";
  /** Present when kind is "literal". */
  char?: string;
  /** Present when kind is "blank" and the count was "0" (unspecified length). */
  unspecified?: boolean;
  highlighted?: boolean;
}

export interface ParsedEnumeration {
  words: EnumerationToken[][];
  wordCount: number;
}

const HIGHLIGHT_RE = /@([\d,]+)$/;
const WORD_COUNT_RE = /;(\d+)$/;

/**
 * Parses PFMD's IPUZ-derived enumeration grammar -- see
 * docs/puzzle-flavored-markdown.md. Never throws: returns null on
 * unparseable input so the caller (answerTag.ts) can degrade to
 * hidden-enumeration behavior and log the failure, rather than one bad
 * clue taking the whole puzzle render down.
 */
export function parseEnumeration(raw: string): ParsedEnumeration | null {
  if (raw.trim() === "") return { words: [], wordCount: 0 };

  let rest = raw;

  let highlightIndices: number[] | null = null;
  const highlightMatch = rest.match(HIGHLIGHT_RE);
  if (highlightMatch) {
    highlightIndices = highlightMatch[1]
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    if (highlightIndices.length === 0) return null;
    rest = rest.slice(0, rest.length - highlightMatch[0].length);
  }

  let wordCountOverride: number | null = null;
  const wordCountMatch = rest.match(WORD_COUNT_RE);
  if (wordCountMatch) {
    wordCountOverride = Number(wordCountMatch[1]);
    rest = rest.slice(0, rest.length - wordCountMatch[0].length);
  }

  if (rest.trim() === "") return null;

  const wordStrings = rest.split(/[\s,]+/).filter(Boolean);
  if (wordStrings.length === 0) return null;

  const words: EnumerationToken[][] = [];
  for (const wordString of wordStrings) {
    const tokens = tokenizeWord(wordString);
    if (tokens === null) return null;
    words.push(tokens);
  }

  if (highlightIndices) {
    let blankIndex = 0;
    for (const word of words) {
      for (const token of word) {
        if (token.kind === "blank") {
          blankIndex++;
          if (highlightIndices.includes(blankIndex)) token.highlighted = true;
        }
      }
    }
  }

  return { words, wordCount: wordCountOverride ?? wordStrings.length };
}

function tokenizeWord(word: string): EnumerationToken[] | null {
  const tokens: EnumerationToken[] = [];
  let i = 0;
  while (i < word.length) {
    const ch = word[i];

    if (ch === "\\" || ch === "`") {
      const next = word[i + 1];
      if (next === undefined) return null;
      tokens.push({ kind: "literal", char: next });
      i += 2;
      continue;
    }

    if (ch === "*" || ch === "^" || ch === "+") {
      // Typographic hints (capitalize word/letter, foreign/archaic),
      // lifted from IPUZ for spec completeness -- our answer rendering is
      // always plain uppercase (see lib/puzzles/answerDisplay.ts), so
      // these are parsed only so they aren't misread as literal
      // punctuation, then discarded.
      i += 1;
      continue;
    }

    if (ch >= "0" && ch <= "9") {
      let j = i;
      while (j < word.length && word[j] >= "0" && word[j] <= "9") j++;
      const n = Number(word.slice(i, j));
      if (n === 0) {
        tokens.push({ kind: "blank", unspecified: true });
      } else {
        for (let k = 0; k < n; k++) tokens.push({ kind: "blank" });
      }
      i = j;
      continue;
    }

    tokens.push({ kind: "literal", char: ch });
    i += 1;
  }
  return tokens;
}

/** Renders the pre-solve "blanks" display for an answer tag. */
export function renderEnumeration(parsed: ParsedEnumeration): ElementContent[] {
  const nodes: ElementContent[] = [];

  parsed.words.forEach((word, wi) => {
    if (wi > 0) nodes.push({ type: "text", value: " " });
    for (const token of word) {
      if (token.kind === "literal") {
        nodes.push({ type: "text", value: token.char! });
      } else if (token.unspecified) {
        nodes.push({
          type: "element",
          tagName: "span",
          properties: { className: ["pzl-blank", "pzl-blank-unspecified"] },
          children: [{ type: "text", value: "…" }],
        });
      } else {
        nodes.push({
          type: "element",
          tagName: "span",
          properties: {
            className: token.highlighted
              ? ["pzl-blank", "pzl-blank-highlight"]
              : ["pzl-blank"],
          },
          children: [{ type: "text", value: " " }],
        });
      }
    }
  });

  if (parsed.wordCount > 1) {
    nodes.push({ type: "text", value: ` (${parsed.wordCount} words)` });
  }

  return nodes;
}
