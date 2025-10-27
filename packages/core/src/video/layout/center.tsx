import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { useVideoContext } from "../context";

export type VideoCenterProps = {
  className?: string;
  children: React.ReactNode;
};

export function VideoCenter({ className, children }: VideoCenterProps) {
  const { showControls, title, subtitle } = useVideoContext();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {showControls && (
        <motion.div
          key={JSON.stringify(showControls)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.4,
            ease: "easeInOut",
          }}
          className={cn(
            "rv-absolute rv-inset-0 xl:rv-mb-0 rv-px-8 rv-gap-8 rv-flex rv-justify-center rv-w-full rv-items-center",
            {
              "rv-mb-8": Boolean(title || subtitle),
            },
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

VideoCenter.displayName = "Video.Center";
