import type { Root, RootContent, BlockContent, Blockquote } from "mdast";

/**
 * Custom mdast nodes for PFMD's column layout (repurposed blockquotes --
 * see docs/puzzle-flavored-markdown.md's Columns section). Need explicit
 * remark-rehype handlers (see index.ts); not standard mdast/hast types.
 */
export interface PzlColumnsNode {
  type: "pzlColumns";
  children: PzlColumnNode[];
}

export interface PzlColumnNode {
  type: "pzlColumn";
  align: "left" | "center" | "right";
  children: BlockContent[];
}

/**
 * CommonMark parses ">" as blockquote, and nested ">" markers (">>", ">>>")
 * as nested blockquotes -- so a blockquote's *pure nesting depth* (as long
 * as each level has exactly one child, itself a blockquote) directly
 * encodes how many ">" the author wrote, without needing to re-inspect raw
 * source text: depth 1 = left, 2 = center, 3 = right.
 */
function columnAlignment(node: Blockquote): {
  align: PzlColumnNode["align"];
  content: BlockContent[];
} {
  let depth = 1;
  let current: BlockContent = node;
  while (
    current.type === "blockquote" &&
    current.children.length === 1 &&
    current.children[0].type === "blockquote"
  ) {
    depth += 1;
    current = current.children[0];
  }
  const content =
    current.type === "blockquote" ? (current.children as BlockContent[]) : [current];
  const align: PzlColumnNode["align"] =
    depth >= 3 ? "right" : depth === 2 ? "center" : "left";
  return { align, content };
}

/**
 * Groups consecutive top-level blockquote nodes into `pzlColumns` wrappers
 * -- "specify multiple columns in sequence (blank lines in between them)
 * to render them beside each other". A blockquote not adjacent to another
 * one renders as a single one-column group (still gets the alignment
 * treatment, just nothing to sit beside).
 */
export function transformColumns(tree: Root): void {
  const out: RootContent[] = [];
  let pendingColumns: PzlColumnNode[] = [];

  const flush = () => {
    if (pendingColumns.length === 0) return;
    const wrapper: PzlColumnsNode = { type: "pzlColumns", children: pendingColumns };
    out.push(wrapper as unknown as RootContent);
    pendingColumns = [];
  };

  for (const child of tree.children) {
    if (child.type === "blockquote") {
      const { align, content } = columnAlignment(child);
      pendingColumns.push({ type: "pzlColumn", align, children: content });
      continue;
    }
    flush();
    out.push(child);
  }
  flush();

  tree.children = out;
}
