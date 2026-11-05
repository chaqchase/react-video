"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

/** Icons swap in place, like the player's own, and the check holds long enough to read. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : label}
      className="press text-dim hover:text-text hover:bg-line grid size-8 shrink-0 place-items-center rounded-lg"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      <CopyIcon
        className={`col-start-1 row-start-1 transition duration-200 ease-rv ${copied ? "scale-50 opacity-0" : ""}`}
      />
      <CheckIcon
        className={`text-sun col-start-1 row-start-1 transition duration-200 ease-rv ${copied ? "" : "scale-50 opacity-0"}`}
      />
    </button>
  );
}
