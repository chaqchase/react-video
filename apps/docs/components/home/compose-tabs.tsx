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
  const [switched, setSwitched] = useState(false);
  return (
    <div className="mt-10">
      <Segmented
        kind="tabs"
        label="Ways to use the player"
        panelId="compose-panel"
        options={layers.map(({ id, label }) => ({ value: id, label }))}
        value={active}
        onChange={(next) => {
          setSwitched(true);
          setActive(next);
        }}
      />
      <div id="compose-panel" role="tabpanel" className={`mt-8 ${switched ? "panes-animate" : ""}`}>
        {layers.map((layer) => (
          <div key={layer.id} hidden={layer.id !== active}>
            <h3 className="text-[clamp(1.375rem,2.4vw,1.75rem)] font-semibold tracking-[-0.018em]">{layer.title}</h3>
            <p className="text-dim mt-2 max-w-[38em] text-[17px] leading-[1.42] tracking-[-0.014em]">{layer.description}</p>
            <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)]">
              <div className="min-w-0 lg:order-2">{layer.id === active ? layer.demo : null}</div>
              {/* On wide screens the code takes the player's height and scrolls inside it, so the two line up. */}
              <div className="code-frame relative min-w-0 lg:order-1">
                <div className="flex max-h-[460px] flex-col lg:absolute lg:inset-0 lg:max-h-none">
                  <div className="code-frame-bar !pe-3.5">
                    <span className="code-frame-title">{layer.importPath}</span>
                    <span className="tabular-nums">{layer.size}</span>
                  </div>
                  <div className="code-scroll min-h-0 flex-1" tabIndex={0} role="group" aria-label={`${layer.label} code`}>
                    {layer.code}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
