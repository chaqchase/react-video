"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { Segmented } from "@/components/site/segmented";

const TabsContext = createContext({ value: "", id: "" });

export function Tabs({ items, children }: { items: string[]; children: ReactNode }) {
  const [value, setValue] = useState(items[0] ?? "");
  const [switched, setSwitched] = useState(false);
  const id = useId();
  return (
    <div className={`doc-tabset ${switched ? "panes-animate" : ""}`}>
      <Segmented
        kind="tabs"
        size="sm"
        label="Options"
        panelId={`${id}-${value}`}
        options={items.map((item) => ({ value: item, label: item }))}
        value={value}
        onChange={(next) => {
          setSwitched(true);
          setValue(next);
        }}
      />
      <TabsContext.Provider value={{ value, id }}>{children}</TabsContext.Provider>
    </div>
  );
}

/** Every tab renders on the server and hides itself, so switching is instant. */
export function Tab({ value, children }: { value: string; children: ReactNode }) {
  const current = useContext(TabsContext);
  return (
    <div id={`${current.id}-${value}`} role="tabpanel" aria-label={value} hidden={current.value !== value} className="doc-tabpanel">
      {children}
    </div>
  );
}
