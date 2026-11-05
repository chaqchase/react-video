"use client";

import { useEffect, useState } from "react";
import { PACKAGE_SPEC } from "@/lib/site";
import { CopyButton } from "./copy-button";
import { Segmented } from "./segmented";

const MANAGERS = {
  pnpm: "pnpm add",
  npm: "npm install",
  yarn: "yarn add",
  bun: "bun add",
} as const;
type Manager = keyof typeof MANAGERS;

const STORAGE_KEY = "rvk-package-manager";
const options = (Object.keys(MANAGERS) as Manager[]).map((value) => ({ value, label: value }));

export function Install({ extra = "", className = "" }: { extra?: string; className?: string }) {
  const [manager, setManager] = useState<Manager>("pnpm");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage only exists after hydration
      if (saved && saved in MANAGERS) setManager(saved as Manager);
    } catch {
      // Private windows can refuse storage, and pnpm is a fine default.
    }
  }, []);

  const command = `${MANAGERS[manager]} ${PACKAGE_SPEC}${extra ? ` ${extra}` : ""}`;
  return (
    <div className={`bg-raised border-line shadow-raised w-full max-w-[560px] rounded-2xl border ${className}`}>
      <div className="border-line flex items-center justify-between gap-2 border-b py-1.5 pr-1.5 pl-2">
        <Segmented
          label="Package manager"
          options={options}
          value={manager}
          size="sm"
          className="border-transparent bg-transparent"
          onChange={(next) => {
            setManager(next);
            try {
              localStorage.setItem(STORAGE_KEY, next);
            } catch {
              // Remembering the choice is only a convenience.
            }
          }}
        />
        <CopyButton text={command} label="Copy install command" />
      </div>
      <code className="block overflow-x-auto px-4 py-3.5 font-mono text-[13.5px] whitespace-nowrap">
        <span className="text-faint select-none">$ </span>
        {command}
      </code>
    </div>
  );
}

/** One line and a copy button, for when the choice of package manager would be noise. */
export function InstallLine() {
  const command = `pnpm add ${PACKAGE_SPEC}`;
  return (
    <div className="border-line-strong bg-raised flex h-11 items-center gap-1 rounded-xl border pr-1.5 pl-3.5">
      <code className="font-mono text-[13px] whitespace-nowrap">
        <span className="text-faint select-none">$ </span>
        {command}
      </code>
      <CopyButton text={command} label="Copy install command" />
    </div>
  );
}
