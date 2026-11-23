import { codeTransformers, getHighlighter, languageOf, THEMES } from "@/lib/docs/highlight";

/** Code highlighted on the server, so no highlighter reaches the browser. */
export async function Highlighted({ code, lang = "tsx" }: { code: string; lang?: string }) {
  const highlighter = await getHighlighter();
  const html = highlighter.codeToHtml(code.trimEnd(), {
    lang: languageOf(lang),
    themes: THEMES,
    defaultColor: false,
    transformers: codeTransformers(),
  });
  // Shiki builds this from our own source files, so there's nothing to sanitize.
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
