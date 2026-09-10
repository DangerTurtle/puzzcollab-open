import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import type { Handler, Handlers } from "mdast-util-to-hast";
import type { Root as MdastRoot, Nodes as MdastNodes } from "mdast";
import type { Root as HastRoot, Element } from "hast";
import { resolveToggles } from "./frontmatter";
import { applyLiteralPreprocessing } from "./literals";
import { transformAnswerTags, type PzlAnswerTagNode } from "./answerTag";
import { transformColumns, type PzlColumnsNode, type PzlColumnNode } from "./columns";
import { renderEnumeration } from "./enumeration";
import type { PfmdError, PuzzleFormat } from "./types";

export type { PfmdError, PuzzleFormat, ExtensionToggles } from "./types";

export interface PfmdResult {
  tree: HastRoot;
  errors: PfmdError[];
}

// Custom mdast node types (pzlAnswerTag, pzlColumns, pzlColumn) aren't part
// of the standard mdast Nodes union remark-rehype's Handler type expects --
// that's expected for a pluggable node type, not a real type mismatch, so
// these casts are narrow and contained to this one wiring point.
const answerTagHandler: Handler = (_state, node) => {
  const tag = node as unknown as PzlAnswerTagNode;
  const children =
    tag.hidden || !tag.enumeration ? [] : renderEnumeration(tag.enumeration);
  const el: Element = {
    type: "element",
    tagName: "pzl-answer",
    properties: { dataAnswerName: tag.answerName },
    children,
  };
  return el;
};

const columnsHandler: Handler = (state, node) => {
  const wrapper = node as unknown as PzlColumnsNode;
  const el: Element = {
    type: "element",
    tagName: "div",
    properties: { className: ["pzl-columns"] },
    children: wrapper.children.flatMap((col) => {
      const result = state.one(col as unknown as MdastNodes, undefined);
      if (!result) return [];
      return Array.isArray(result) ? result : [result];
    }),
  };
  return el;
};

const columnHandler: Handler = (state, node) => {
  const col = node as unknown as PzlColumnNode;
  const el: Element = {
    type: "element",
    tagName: "div",
    properties: { className: ["pzl-column", `pzl-column-${col.align}`] },
    children: state.all({
      type: "root",
      children: col.children,
    } as unknown as MdastNodes),
  };
  return el;
};

/**
 * Compiles a puzzle body (PFMD or plain markdown, per `format`) into a hast
 * tree, plus any parse errors encountered along the way. Pure function of
 * `body` + `format` alone -- no answer-key access, no viewer/solve-state --
 * so it's safe to run without decrypting anything, and cacheable purely off
 * this input if that ever matters. A later stage (the fill-in pass) is the
 * one that needs the decrypted answer key and per-viewer solve state; it
 * consumes this function's output rather than being part of it.
 *
 * Not sanitized: this stage's output can still contain whatever raw HTML
 * CommonMark itself permits (it's spec-legal for authors to write raw
 * <script>/<img onerror=...> etc. directly in body, and this stage doesn't
 * strip it). Sanitization happens once, centrally, in the stage-3
 * serializer -- never render this function's `tree` to a real browser
 * without going through that first.
 */
export function pfmdToHast(body: string, format: PuzzleFormat): PfmdResult {
  const { toggles, content } = resolveToggles(body, format);
  const preprocessed = applyLiteralPreprocessing(content, toggles);

  const errors: PfmdError[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(function attachPfmdExtensions() {
      return (tree: MdastRoot) => {
        if (toggles.answerTags) transformAnswerTags(tree, errors);
        if (toggles.columns) transformColumns(tree);
      };
    })
    .use(remarkRehype, {
      // Raw HTML passthrough is a sanitization concern, deliberately
      // deferred to the stage-3 serializer (see docs comment above) rather
      // than handled ad hoc here.
      allowDangerousHtml: true,
      // `Handlers` is keyed by the standard mdast node-type union, which
      // doesn't (and can't) include our custom pzl* node types -- same
      // "expected for a pluggable node type" cast as above, just applied to
      // the whole map at once since TS can't partially widen a Record key.
      handlers: {
        pzlAnswerTag: answerTagHandler,
        pzlColumns: columnsHandler,
        pzlColumn: columnHandler,
      } as unknown as Handlers,
    });

  const mdastTree = processor.parse(preprocessed);
  const hastTree = processor.runSync(mdastTree) as HastRoot;

  return { tree: hastTree, errors };
}
