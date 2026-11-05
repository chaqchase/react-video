import type { ReactNode } from "react";

/** Doc comments use backticks for code, which tables should show as code too. */
export function DocText({ children }: { children: string }): ReactNode {
  return children.split(/(`[^`]+`)/).map((part, index) =>
    part.startsWith("`") ? (
      <code key={index} className="bg-sunken border-line rounded border px-1 py-px font-mono text-[0.88em]">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    )
  );
}
