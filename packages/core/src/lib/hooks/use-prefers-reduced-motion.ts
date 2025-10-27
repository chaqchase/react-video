import { useEffect, useState } from "react";

/**
 * React hook to detect the user's prefers-reduced-motion setting.
 * Returns true when the OS preference is set to reduce motion.
 */
export function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefers(!!query.matches);
    update();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    } else if (typeof query.addListener === "function") {
      // Fallback for older Safari
      query.addListener(update);
      return () => query.removeListener(update);
    }
  }, []);

  return prefers;
}

