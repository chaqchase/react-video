"use client";

import { useState, type ReactNode } from "react";
import { CopyButton } from "@/components/site/copy-button";
import { Segmented } from "@/components/site/segmented";

interface DemoFrameProps {
  preview: ReactNode;
  code: ReactNode;
  source: string;
  slug: string;
  id: string;
}

/** A live example above its exact source. The preview stays mounted when viewing code. */
export function DemoFrame({ preview, code, source, slug, id }: DemoFrameProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  return (
    <figure className="not-prose border-line bg-raised my-6 overflow-hidden rounded-2xl border">
      <div className="border-line flex items-center justify-between gap-2 border-b px-2 py-1.5">
        <Segmented
          kind="tabs"
          size="sm"
          label="Example view"
          panelId={id}
          className="border-transparent bg-transparent"
          options={[
            { value: "preview" as const, label: "Preview" },
            { value: "code" as const, label: "Code" },
          ]}
          value={tab}
          onChange={(next) => setTab(next)}
        />
        <div className="flex items-center gap-1">
          <a href={`/examples/${slug}`} className="press text-dim hover:text-text hover:bg-line rounded-lg px-2.5 py-1.5 text-[12.5px]">
            Open alone
          </a>
          <CopyButton text={source} label="Copy this example" />
        </div>
      </div>
      <div id={id} role="tabpanel">
        <div hidden={tab !== "preview"} className="playground-stage p-3 sm:p-5">
          {preview}
        </div>
        <div hidden={tab !== "code"} className="bg-code max-h-[520px] overflow-auto">
          {code}
        </div>
      </div>
    </figure>
  );
}
