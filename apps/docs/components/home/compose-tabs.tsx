"use client";

import { useState, type ReactNode } from "react";
import { Segmented } from "@/components/site/segmented";

export interface ComposeLayer {
  id: string;
  label: string;
  title: string;
  description: string;
  importPath: string;
  size: string;
  code: ReactNode;
  demo: ReactNode;
}

export function ComposeTabs({ layers }: { layers: readonly ComposeLayer[] }) {
  const [active, setActive] = useState(layers[0]?.id ?? "");
  return (
    <div className="mt-12">
      <Segmented
        kind="tabs"
        label="Ways to use the player"
        panelId="compose-panel"
        options={layers.map(({ id, label }) => ({ value: id, label }))}
        value={active}
        onChange={(next) => setActive(next)}
      />
      <div id="compose-panel" role="tabpanel" className="mt-5">
        {layers.map((layer) => (
          <div key={layer.id} hidden={layer.id !== active}>
            <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{layer.title}</h3>
            <p className="text-dim mt-1.5 max-w-[64ch] text-[14.5px] leading-relaxed">{layer.description}</p>
            <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
              <div className="min-w-0 lg:order-2">{layer.id === active ? layer.demo : null}</div>
              <div className="bg-code border-line max-h-[460px] min-w-0 overflow-auto rounded-2xl border lg:order-1">
                <div className="border-line text-dim bg-code sticky top-0 flex items-center justify-between border-b px-[18px] py-2.5 font-mono text-[12px]">
                  <span>{layer.importPath}</span>
                  <span className="text-sun">{layer.size}</span>
                </div>
                {layer.code}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
