import File02Icon from "@hugeicons/core-free-icons/File02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { ScrollArea } from "@/components/docs/scroll-area";
import { CopyButton } from "./copy-button";

interface CodeFrameProps {
  /** What the copy button copies. */
  code: string;
  /** Shown in the corner of a block with no title. */
  lang?: string;
  /** A file name, drawn as a bar above the code. */
  title?: string;
  /** Names the code for screen readers. */
  label: string;
  className?: string;
  children: ReactNode;
}

/** The one surface for code on the site. */
export function CodeFrame({ code, lang, title, label, className = "", children }: CodeFrameProps) {
  const copy = <CopyButton text={code} label="Copy this code" className="code-copy" />;
  return (
    <figure className={`code-frame ${className}`}>
      {title ? (
        <figcaption className="code-frame-bar">
          <span className="code-frame-title">
            <HugeiconsIcon icon={File02Icon} size={14} strokeWidth={1.75} aria-hidden={true} />
            {title}
          </span>
          {copy}
        </figcaption>
      ) : (
        <div className="code-frame-corner">
          {lang && lang !== "text" ? <span className="code-frame-lang">{lang}</span> : null}
          {copy}
        </div>
      )}
      <ScrollArea label={title ?? label} className="code-scroll">
        {children}
      </ScrollArea>
    </figure>
  );
}
