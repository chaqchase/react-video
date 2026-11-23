import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import type { DocPage } from "./content";
import { codeTransformers, getHighlighter, languageOf, THEMES } from "./highlight";
import { createSlugger } from "./slug";

export interface TocItem {
  id: string;
  title: string;
  depth: number;
}

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  data?: { meta?: string };
}

const textOf = (node: HastNode): string => node.value ?? (node.children ?? []).map(textOf).join("");

/** Heading ids and the table of contents, highlighted code, and a class on inline code. */
function rehypeDocs(toc: TocItem[]) {
  return async (tree: HastNode) => {
    const highlighter = await getHighlighter();
    const slug = createSlugger();
    let samples = 0;

    const walk = (node: HastNode) => {
      const depth = /^h([1-6])$/.exec(node.tagName ?? "")?.[1];
      if (depth) {
        const title = textOf(node);
        const id = slug(title);
        node.properties = { ...node.properties, id };
        if (depth === "2" || depth === "3") toc.push({ id, title, depth: Number(depth) });
      }
      if (node.tagName === "pre") {
        const code = node.children?.find((child) => child.tagName === "code");
        if (code) {
          const classes = (code.properties?.className ?? []) as string[];
          const lang = classes.find((name) => name.startsWith("language-"))?.slice("language-".length);
          const raw = textOf(code).trimEnd();
          const highlighted = highlighter.codeToHast(raw, {
            lang: languageOf(lang),
            themes: THEMES,
            defaultColor: false,
            transformers: codeTransformers(code.data?.meta),
          });
          const shiki = (highlighted.children[0] as HastNode | undefined)?.children?.[0];
          samples += 1;
          node.properties = {
            "data-code": raw,
            "data-lang": languageOf(lang),
            "data-title": /title="([^"]*)"/.exec(code.data?.meta ?? "")?.[1],
            "data-sample": samples,
          };
          node.children = shiki ? [shiki] : node.children;
        }
        return;
      }
      if (node.tagName === "code") node.properties = { ...node.properties, className: ["doc-code"] };
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

/** Pages render on the server, so MDX compiles here and none of this reaches the browser. */
export async function compile(page: DocPage) {
  const toc: TocItem[] = [];
  const { default: MDX } = await evaluate(page.body, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [() => rehypeDocs(toc)],
  });
  return { MDX, toc };
}
