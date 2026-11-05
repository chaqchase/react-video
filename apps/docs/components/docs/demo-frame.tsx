"use client";

import { useRef, useState, type ReactNode } from "react";
import { CopyButton } from "@/components/site/copy-button";
import { ChevronIcon } from "@/components/site/icons";
import { Segmented } from "@/components/site/segmented";

interface DemoFrameProps {
  preview: ReactNode;
  code: ReactNode;
  source: string;
  slug: string;
  id: string;
  /** Keeps a demo that starts by itself from doing so until someone asks. */
  manual?: boolean;
}

/** A live example above its exact source. The preview stays mounted when viewing code. */
export function DemoFrame({ preview, code, source, slug, id, manual = false }: DemoFrameProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [started, setStarted] = useState(!manual);
  // Panes only animate after someone switches, because fading on load would cut the player's glass off from its video.
  const [switched, setSwitched] = useState(false);
  const [height, setHeight] = useState<number>();
  const previewPane = useRef<HTMLDivElement>(null);
  return (
    <figure className="doc-panel">
      <div className="doc-panel-bar">
        <Segmented
          kind="tabs"
          size="sm"
          label="Example view"
          panelId={id}
          options={[
            { value: "preview" as const, label: "Preview" },
            { value: "code" as const, label: "Code" },
          ]}
          value={tab}
          onChange={(next) => {
            // The code takes the preview's height, so switching doesn't move the page.
            if (previewPane.current?.offsetHeight) setHeight(Math.max(previewPane.current.offsetHeight, 320));
            setSwitched(true);
            setTab(next);
          }}
        />
        <div className="flex items-center gap-1">
          <a href={`/examples/${slug}`} className="doc-open">
            Open alone
            <ChevronIcon width={11} height={11} />
          </a>
          <CopyButton text={source} label="Copy this example" className="code-copy" />
        </div>
      </div>
      <div id={id} role="tabpanel">
        <div ref={previewPane} hidden={tab !== "preview"} className="doc-demo" data-switched={switched || undefined}>
          {started ? (
            preview
          ) : (
            <div className="doc-demo-start grid aspect-video place-items-center bg-[url(/media/poster.jpg)] bg-cover bg-center">
              <button type="button" className="btn btn-primary press" onClick={() => setStarted(true)}>
                Start this demo
              </button>
            </div>
          )}
        </div>
        <div hidden={tab !== "code"} className="doc-demo-code code-scroll" style={{ height }}>
          {code}
        </div>
      </div>
    </figure>
  );
}
