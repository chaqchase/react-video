import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { useVideoContext } from "../context";

export type VideoBackdropProps = {
  className?: string;
};

export function VideoBackdrop({ className }: VideoBackdropProps) {
  const { showControls, isFullscreen } = useVideoContext();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      <motion.div
        key={JSON.stringify(showControls)}
        initial={{ opacity: 0 }}
        animate={{
          opacity: showControls && !isFullscreen ? 0.5 : 0,
        }}
        exit={{ opacity: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.3,
          ease: "easeInOut",
        }}
        className={cn(
          "rv-absolute rv-inset-0 rv-bg-gradient-to-br rv-from-black rv-via-black/50 rv-to-black",
          { "rv-rounded-xl": !isFullscreen },
          className
        )}
      />
    </AnimatePresence>
  );
}

VideoBackdrop.displayName = "Video.Backdrop";
