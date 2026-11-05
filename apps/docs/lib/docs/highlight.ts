import { createHighlighter, type Highlighter, type ShikiTransformer } from "shiki";
import { codeThemes } from "@/lib/code-theme";

const LANGUAGES = ["tsx", "ts", "jsx", "js", "json", "css", "bash", "html", "astro"];

export const THEMES = { light: codeThemes.light.name, dark: codeThemes.dark.name };

let highlighter: Promise<Highlighter> | undefined;

/** One highlighter for the whole build, because creating one is slow. */
export function getHighlighter() {
  highlighter ??= createHighlighter({ themes: [codeThemes.light, codeThemes.dark], langs: LANGUAGES });
  return highlighter;
}

export const languageOf = (lang: string | undefined) => (lang && LANGUAGES.includes(lang) ? lang : "text");

/** Reads the lines to emphasize from a fence's meta, as in `{1,4-6}`. */
function emphasized(meta = "") {
  const lines = new Set<number>();
  for (const part of /\{([\d,\s-]+)\}/.exec(meta)?.[1]?.split(",") ?? []) {
    const [start = 0, end = start] = part.split("-").map(Number);
    for (let line = start; line <= end; line += 1) lines.add(line);
  }
  return lines;
}

/** Every highlighted block on the site goes through this, so they all come out the same. */
export const codeTransformers = (meta?: string): ShikiTransformer[] => {
  const lines = emphasized(meta);
  return [
    {
      pre(node) {
        delete node.properties.style;
        this.addClassToHast(node, "code-pre shiki-themed");
      },
      // Lines are blocks, so the newlines between them would each add an empty row.
      code(node) {
        node.children = node.children.filter((child) => child.type !== "text" || child.value !== "\n");
      },
      line(node, line) {
        if (lines.has(line)) this.addClassToHast(node, "code-line-on");
      },
    },
  ];
};
