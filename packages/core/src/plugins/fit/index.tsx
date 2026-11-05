"use client";

import { forwardRef, type SVGProps } from "react";
import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";

export type FitMode = "contain" | "cover";

export interface FitOptions {
  /** How to fit the picture at first: whole, or filling the frame. */
  mode?: FitMode;
}

/** How far the shapes can differ before there's anything to switch between. */
const SAME_SHAPE = 0.01;

/** Switches between showing the whole picture and filling the frame. */
export const fit = definePlugin("fit", (options: FitOptions = {}) => ({
  state: () => ({
    /** How the picture fits the frame. */
    mode: options.mode ?? ("contain" as FitMode),
    /** True when the picture and the frame have different shapes, so switching shows a change. */
    available: false,
  }),
  attrs: { "data-fit": (state) => state.mode },
  commands(context) {
    const set = (mode: FitMode) => context.set({ mode });
    return {
      /** Sets how the picture fits the frame. */
      set,
      /** Switches between the two. */
      toggle: () => set(context.state().mode === "cover" ? "contain" : "cover"),
    };
  },
  attach(context, element, scope) {
    const root = context.root();
    if (!root) return;
    const measure = () => {
      const { width, height } = root.getBoundingClientRect();
      const { videoWidth, videoHeight } = element;
      if (!width || !height || !videoWidth || !videoHeight) return;
      const shape = width / height / (videoWidth / videoHeight);
      context.set({ available: Math.abs(shape - 1) > SAME_SHAPE });
    };
    scope.on(element, "loadedmetadata", measure);
    scope.on(element, "resize", measure);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    scope.add(() => observer.disconnect());
  },
  slots: { "top-end": FitButton },
}));

const glyph = {
  viewBox: "0 0 24 24",
  width: "1em",
  height: "1em",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} satisfies SVGProps<SVGSVGElement>;

export type FitButtonProps = ButtonProps;

/** Renders nothing when the picture already matches the frame's shape. */
export const FitButton = forwardRef<HTMLButtonElement, FitButtonProps>(function FitButton(
  { onClick, children, ...props },
  ref
) {
  const mode = useVideoState(fit, (state) => state.mode);
  const available = useVideoState(fit, (state) => state.available);
  const { toggle } = useCommands(fit);
  const fill = useLabel("fill", "Fill the frame");
  const whole = useLabel("fitWhole", "Show the whole picture");
  if (!available) return null;
  return (
    <Button
      ref={ref}
      data-part="fit"
      aria-label={mode === "cover" ? whole : fill}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) toggle();
      }}
      {...props}
    >
      {children ??
        (mode === "cover" ? (
          <svg {...glyph}>
            <path d="M4.500 9.500h5v-5M19.500 14.500h-5v5M3.500 3.500l6 6M20.500 20.500l-6-6" />
          </svg>
        ) : (
          <svg {...glyph}>
            <path d="M9.500 3.500h-6v6M14.500 20.500h6v-6M3.500 3.500l7 7M20.500 20.500l-7-7" />
          </svg>
        ))}
    </Button>
  );
});
FitButton.displayName = "Video.FitButton";
