"use client";

import { useEffect, useState } from "react";

/** Keep in step with the exit transition, plus some margin for timer drift. */
const EXIT_MS = 200;

/** Keeps a closing element mounted long enough for its exit transition to play. */
export function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open || !mounted) return;
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [mounted, open]);
  return mounted;
}
