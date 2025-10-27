import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { useVideoContext } from "../context";

export type VideoFooterProps = {
  className?: string;
  children: React.ReactNode;
};

export function VideoFooter({ className, children }: VideoFooterProps) {
  const { showControls } = useVideoContext();
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
            "rv-absolute rv-inset-0 rv-flex rv-flex-col rv-justify-end rv-px-6 xl:rv-px-8 rv-gap-2 lg:rv-gap-3 rv-py-4 xl:rv-py-6 rv-bottom-0",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

VideoFooter.displayName = "Video.Footer";
