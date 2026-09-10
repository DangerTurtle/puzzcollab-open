import type { ExtensionToggles } from "./types";

/**
 * PFMD's literal-brackets/underscores/line-break rules are implemented as a
 * raw-text pre-pass that leans on CommonMark's *own* escape mechanics
 * (backslash-escaping punctuation, two-trailing-spaces for a hard break)
 * rather than overriding micromark's tokenizers directly -- much smaller
 * surface area to get wrong, and it composes safely with an unmodified
 * CommonMark parser downstream.
 *
 * Fenced code blocks and inline code spans are explicitly skipped: inside
 * code, CommonMark's backslash-escape and hard-break rules don't apply, so
 * rewriting there would corrupt any code sample an author pastes into a
 * puzzle body (e.g. turning `foo_bar` inside a code span into `foo\_bar`,
 * changing what actually gets copy-pasted out of the rendered page).
 *
 * Both boundary trackers below intentionally mirror CommonMark's own rules
 * rather than a simplified approximation, because getting them wrong means
 * *silently* corrupting an author's code sample (rewriting content they
 * never asked us to touch) rather than a fully-broken visible tag like a
 * malformed answer tag -- much easier to ship unnoticed:
 * - Fences: a closing fence needs a marker run at least as long as the
 *   opening one, with nothing but whitespace after it (CommonMark spec).
 *   Matching on marker character alone would let a shorter run, or a line
 *   like "```text" appearing later for unrelated reasons, close the fence
 *   early and expose real code lines to escaping.
 * - Code spans: CommonMark backtick spans can cross a line break within the
 *   same paragraph (closed by the next backtick run of *equal* length,
 *   which may be several lines down). Scanning line-by-line only would
 *   escape brackets/underscores inside the still-open portion of such a
 *   span. Span state is threaded across lines and reset at each paragraph
 *   boundary (blank line) or fence line, since a span can't cross either.
 */
export function applyLiteralPreprocessing(
  source: string,
  toggles: ExtensionToggles,
): string {
  if (
    !toggles.literalBrackets &&
    !toggles.literalUnderscores &&
    !toggles.literalLineBreaks
  ) {
    return source;
  }

  // Normalize line endings up front. Without this, a CRLF body's blank
  // lines are the string "\r" rather than "", so the paragraph-boundary
  // checks below (both here and for fence/span resets) would silently
  // treat a CRLF blank line as ordinary in-paragraph content. CommonMark
  // itself treats CRLF and LF line endings identically, so this loses
  // nothing downstream.
  const normalized = source.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const out: string[] = [];

  let inFence = false;
  let fenceMarker = "";
  let fenceLength = 0;
  let openSpanMarker: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = matchFenceLine(line);

    if (inFence) {
      const closesFence =
        fenceMatch !== null &&
        fenceMatch.marker === fenceMarker &&
        fenceMatch.length >= fenceLength &&
        fenceMatch.trailing.trim() === "";
      if (closesFence) inFence = false;
      out.push(line);
      continue;
    }

    if (fenceMatch) {
      inFence = true;
      fenceMarker = fenceMatch.marker;
      fenceLength = fenceMatch.length;
      openSpanMarker = null;
      out.push(line);
      continue;
    }

    if (line === "") {
      // Blank line: paragraph boundary, can't have a code span (or
      // anything else) crossing it.
      openSpanMarker = null;
      out.push(line);
      continue;
    }

    const { processed: escaped, nextOpenMarker } = escapeLineTrackingCodeSpans(
      line,
      toggles,
      openSpanMarker,
    );
    openSpanMarker = nextOpenMarker;

    let processed = escaped;
    if (toggles.literalLineBreaks) {
      const isLastLine = i === lines.length - 1;
      const nextIsBlank = !isLastLine && lines[i + 1] === "";
      // Only breaks *within* a paragraph are reversed -- paragraph
      // boundaries (blank lines) and end-of-content are left alone. A line
      // break that falls *inside* a still-open multiline code span isn't a
      // paragraph break at all (it's literal whitespace the span will keep
      // verbatim), so leave those alone too.
      if (!isLastLine && !nextIsBlank && openSpanMarker === null) {
        processed = processed.endsWith("\\")
          ? // PFMD wants a backslash-preceded break *ignored* (soft) --
            // the opposite of vanilla CommonMark, where trailing "\" forces
            // a hard break. Strip it so the line falls through to
            // CommonMark's default (ignored) soft-break handling.
            processed.slice(0, -1)
          : // Plain break: PFMD wants this *preserved* (hard) by default.
            // Appending CommonMark's own two-trailing-spaces hard-break
            // trigger reuses the spec's existing mechanism instead of
            // introducing a custom one.
            processed + "  ";
      }
    }

    out.push(processed);
  }

  return out.join("\n");
}

interface FenceLineMatch {
  marker: string;
  length: number;
  trailing: string;
}

function matchFenceLine(line: string): FenceLineMatch | null {
  const m = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
  if (!m) return null;
  return { marker: m[1][0], length: m[1].length, trailing: m[2] };
}

/**
 * Finds the next run of one or more backticks in `line` at/after `from`.
 */
function nextBacktickRun(
  line: string,
  from: number,
): { start: number; end: number } | null {
  const re = /`+/g;
  re.lastIndex = from;
  const m = re.exec(line);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length };
}

/**
 * Scans forward from `from` for a backtick run whose length exactly matches
 * `marker` (CommonMark closes a code span on the first backtick string of
 * *equal* length -- a shorter or longer run is just more code content, not
 * a close), returning null if the line ends before one is found (the span
 * stays open into the next line).
 */
function findClosingRun(
  line: string,
  from: number,
  marker: string,
): { start: number; end: number } | null {
  let i = from;
  for (;;) {
    const run = nextBacktickRun(line, i);
    if (!run) return null;
    if (run.end - run.start === marker.length) return run;
    i = run.end;
  }
}

function escapeLineTrackingCodeSpans(
  line: string,
  toggles: ExtensionToggles,
  openMarker: string | null,
): { processed: string; nextOpenMarker: string | null } {
  let marker = openMarker;
  let i = 0;
  let out = "";

  while (i < line.length) {
    if (marker !== null) {
      const close = findClosingRun(line, i, marker);
      if (!close) {
        out += line.slice(i);
        i = line.length;
        // marker stays open into the next line
      } else {
        out += line.slice(i, close.end);
        i = close.end;
        marker = null;
      }
      continue;
    }

    const run = nextBacktickRun(line, i);
    if (!run) {
      out += escapeText(line.slice(i), toggles);
      i = line.length;
      continue;
    }

    out += escapeText(line.slice(i, run.start), toggles);
    out += line.slice(run.start, run.end);
    marker = line.slice(run.start, run.end);
    i = run.end;
  }

  return { processed: out, nextOpenMarker: marker };
}

function escapeText(text: string, toggles: ExtensionToggles): string {
  let escaped = text;
  if (toggles.literalBrackets) escaped = escaped.replace(/([[\]])/g, "\\$1");
  if (toggles.literalUnderscores) escaped = escaped.replace(/_/g, "\\_");
  return escaped;
}
