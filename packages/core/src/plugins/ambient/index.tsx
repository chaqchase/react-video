"use client";

import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { MenuItem } from "../../react/primitives/menu-item";

export interface AmbientOptions {
  /** Start with the glow on. */
  enabled?: boolean;
  /** Times per second to sample while playing, up to 4. */
  rate?: number;
}

const MAX_RATE = 4;
const REDUCED_RATE = 1;
const WIDTH = 8;
const HEIGHT = 4;
/** How many columns at each side of the sample make up that side's colour. */
const EDGE = 2;
/** Smaller changes write nothing, so a still scene costs no repaints. */
const MIN_CHANGE = 6;
/** Below this the picture is black, and tinting its noise would look wrong. */
const MIN_SIGNAL = 8;
/** Night footage gives almost no light, so its brightest channel is raised to this. */
const MIN_PEAK = 110;

type Rgb = readonly [number, number, number];

function averageColumns(data: Uint8ClampedArray, first: number): Rgb {
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let row = 0; row < HEIGHT; row += 1) {
    for (let column = first; column < first + EDGE; column += 1) {
      const at = (row * WIDTH + column) * 4;
      red += data[at] ?? 0;
      green += data[at + 1] ?? 0;
      blue += data[at + 2] ?? 0;
    }
  }
  const count = HEIGHT * EDGE;
  const peak = Math.max(red, green, blue) / count;
  const gain = peak < MIN_SIGNAL || peak >= MIN_PEAK ? 1 : MIN_PEAK / peak;
  return [
    Math.round((red / count) * gain),
    Math.round((green / count) * gain),
    Math.round((blue / count) * gain),
  ];
}

const moved = (a: Rgb | null, b: Rgb) =>
  !a || a.some((channel, index) => Math.abs(channel - (b[index] ?? 0)) >= MIN_CHANGE);

/**
 * A soft glow around the player in the colours at the picture's edges. It samples a
 * tiny copy of the frame and writes straight to CSS variables, so it never renders.
 */
export const ambient = definePlugin("ambient", (options: AmbientOptions = {}) => {
  let sample = () => {};
  return {
    state: () => ({
      /** True while the viewer wants the glow. */
      enabled: options.enabled ?? true,
      /** False once the browser refuses to read the video, as it does cross-origin without CORS. */
      available: true,
    }),
    attrs: { "data-ambient": (state) => state.enabled && state.available },
    commands(context) {
      const set = (enabled: boolean) => {
        context.set({ enabled });
        sample();
      };
      return {
        /** Turns the glow on or off. */
        set,
        /** Turns the glow off, or back on. */
        toggle: () => set(!context.state().enabled),
      };
    },
    source(context) {
      context.set({ available: true });
    },
    attach(context, element, scope) {
      const root = context.root();
      if (!root) return;
      let drawing: CanvasRenderingContext2D | null = null;
      let left: Rgb | null = null;
      let right: Rgb | null = null;
      let timer: ReturnType<typeof setInterval> | undefined;

      const write = (name: string, color: Rgb) => {
        root.style.setProperty(name, `rgb(${color.join(" ")})`);
      };

      sample = () => {
        const { enabled, available } = context.state();
        // Fullscreen leaves nothing around the player to light.
        if (!enabled || !available || element.readyState < 2 || document.fullscreenElement) return;
        if (!drawing) {
          // A canvas stays unreadable after a refusal, so each attempt gets a new one.
          const canvas = document.createElement("canvas");
          canvas.width = WIDTH;
          canvas.height = HEIGHT;
          drawing = canvas.getContext("2d", { willReadFrequently: true });
          if (!drawing) {
            context.set({ available: false });
            return;
          }
        }
        try {
          drawing.drawImage(element, 0, 0, WIDTH, HEIGHT);
          const { data } = drawing.getImageData(0, 0, WIDTH, HEIGHT);
          const nextLeft = averageColumns(data, 0);
          const nextRight = averageColumns(data, WIDTH - EDGE);
          if (moved(left, nextLeft)) write("--rv-ambient-left", (left = nextLeft));
          if (moved(right, nextRight)) write("--rv-ambient-right", (right = nextRight));
        } catch (error) {
          if ((error as Error).name !== "SecurityError") return;
          drawing = null;
          context.set({ available: false });
        }
      };

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const rate = Math.min(options.rate ?? MAX_RATE, still ? REDUCED_RATE : MAX_RATE);
      const run = (playing: boolean) => {
        clearInterval(timer);
        timer = playing && rate > 0 ? setInterval(sample, 1000 / rate) : undefined;
      };
      const playing = () => {
        const { paused, ended } = context.media();
        return !paused && !ended;
      };
      context.watch(scope, playing, run);
      run(playing());

      scope.on(element, "seeked", () => sample());
      scope.on(element, "loadeddata", () => sample());
      scope.add(() => {
        clearInterval(timer);
        sample = () => {};
        root.style.removeProperty("--rv-ambient-left");
        root.style.removeProperty("--rv-ambient-right");
      });
    },
    slots: { menu: AmbientMenu },
  };
});

/** Renders nothing once the browser refuses to read the video. */
export function AmbientMenu() {
  const enabled = useVideoState(ambient, (state) => state.enabled);
  const available = useVideoState(ambient, (state) => state.available);
  const { toggle } = useCommands(ambient);
  const title = useLabel("ambient", "Ambient light");
  if (!available) return null;
  return (
    <MenuItem role="menuitemcheckbox" aria-checked={enabled} keepOpen data-menu="ambient" onSelect={toggle}>
      <span data-part="menu-item-label">{title}</span>
    </MenuItem>
  );
}
AmbientMenu.displayName = "Video.AmbientMenu";
