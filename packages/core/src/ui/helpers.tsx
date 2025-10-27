import { AnimatePresence, motion } from "motion/react";
import { IfElseProps, IfProps } from "../types/helpers.types";
import { cn } from "@/lib/utils";

export function If({ condition, children }: IfProps) {
  return <>{condition && children}</>;
}
export function IfElse({
  condition,
  children,
  fallback,
  className,
  fallbackClassName,
}: IfElseProps) {
  return (
    <AnimatePresence key={JSON.stringify(condition)} mode="wait">
      {condition && (
        <motion.div
          className={cn(className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {children}
        </motion.div>
      )}
      {!condition && (
        <motion.div
          className={cn(fallbackClassName)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {fallback}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
