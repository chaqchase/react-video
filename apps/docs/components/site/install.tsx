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

export function Install({
  extra = "",
  className = "",
  hero = false,
}: {
  extra?: string;
  className?: string;
  /** Draws the command as one large pill, for the end of a page. */
  hero?: boolean;
}) {
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
  const picker = (
    <Segmented
      label="Package manager"
      options={options}
      value={manager}
      size="sm"
      onChange={(next) => {
        setManager(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Remembering the choice is only a convenience.
        }
      }}
    />
  );
  const line = (
    <div className="code-scroll">
      <code key={manager} className="code-command">
        <span aria-hidden="true">$</span>
        {command}
      </code>
    </div>
  );
  const copy = <CopyButton text={command} label="Copy install command" className="code-copy" />;

  if (hero) {
    return (
      <div className={`install-hero ${className}`}>
        {picker}
        <div className="install-hero-line">
          {line}
          {copy}
        </div>
      </div>
    );
  }
  return (
    <div className={`code-frame ${className}`}>
      <div className="code-frame-bar code-frame-bar-tabs">
        {picker}
        {copy}
      </div>
      {line}
    </div>
  );
}

