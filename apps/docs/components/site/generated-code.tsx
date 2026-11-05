"use client";

import { useMemo } from "react";
import { CopyButton } from "./copy-button";

const TOKEN =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*")|\b(import|from|const|export|function|return|default)\b|(<\/?[A-Z][\w.]*|\/?>)/g;

function tokens(line: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const [text, comment, string, keyword] = match;
    if (match.index > last) parts.push(line.slice(last, match.index));
    const kind = comment ? "comment" : string ? "string" : keyword ? "keyword" : "tag";
    parts.push(
      <span key={match.index} className={`code-tok-${kind}`}>
        {text}
      </span>
    );
    last = match.index + text.length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

/**
 * Lines are keyed by their content, so React keeps the ones that stay and only new
 * ones animate in. Turning a plugin on visibly adds exactly the code it needs.
 */
export function GeneratedCode({ code, label, className = "" }: { code: string; label: string; className?: string }) {
  const lines = useMemo(() => {
    const seen = new Map<string, number>();
    return code.split("\n").map((line) => {
      const count = seen.get(line) ?? 0;
      seen.set(line, count + 1);
      return { line, key: `${line}#${count}` };
    });
  }, [code]);

  return (
    <div className={`bg-code border-line relative overflow-hidden rounded-2xl border ${className}`}>
      <div className="absolute top-2 right-2 z-10">
        <CopyButton text={code} label={label} />
      </div>
      <pre
        tabIndex={0}
        aria-label={label}
        className="overflow-x-auto py-4 font-mono text-[12.5px] leading-[1.65] [tab-size:2]"
      >
        <code>
          {lines.map(({ line, key }) => (
            <span key={key} className="code-line">
              {tokens(line)}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
