import { highlight } from "fumadocs-core/highlight";
import { codeThemes } from "@/lib/code-theme";

/** Code highlighted on the server, so no highlighter reaches the browser. */
export async function Highlighted({ code, lang = "tsx" }: { code: string; lang?: string }) {
  const rendered = await highlight(code.trimEnd(), {
    lang,
    themes: codeThemes,
    defaultColor: false,
    components: {
      pre: (props) => (
        <pre
          {...props}
          style={undefined}
          className="shiki-themed overflow-x-auto px-[18px] py-4 font-mono text-[13px] leading-[1.65] [tab-size:2]"
        />
      ),
    },
  });
  return <>{rendered}</>;
}
