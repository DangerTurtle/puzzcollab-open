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

  const lines = source.split("\n");
  const out: string[] = [];
  let inFence = false;
  let fenceMarker = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);

    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1][0];
      } else if (fenceMatch[1][0] === fenceMarker) {
        inFence = false;
      }
      out.push(line);
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    let processed = escapeLineOutsideCodeSpans(line, toggles);

    if (toggles.literalLineBreaks) {
      const isLastLine = i === lines.length - 1;
      const thisIsBlank = line === "";
      const nextIsBlank = !isLastLine && lines[i + 1] === "";
      // Only breaks *within* a paragraph are reversed -- paragraph
      // boundaries (blank lines) and end-of-content are left alone.
      if (!isLastLine && !thisIsBlank && !nextIsBlank) {
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

function escapeLineOutsideCodeSpans(
  line: string,
  toggles: ExtensionToggles,
): string {
  const parts = line.split(/(`+[^`]*`+)/);
  return parts
    .map((part, idx) => {
      const isCodeSpan = idx % 2 === 1;
      if (isCodeSpan) return part;
      let escaped = part;
      if (toggles.literalBrackets) escaped = escaped.replace(/([[\]])/g, "\\$1");
      if (toggles.literalUnderscores) escaped = escaped.replace(/_/g, "\\_");
      return escaped;
    })
    .join("");
}
