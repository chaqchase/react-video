import { definePlugin } from "../../core/plugin";

export type VideoOrientation = "landscape" | "portrait" | "square";

export interface OrientationOptions {
  /**
   * The shape to reserve until the video's own is known, so the page doesn't shift
   * when it loads. It also renders on the server.
   */
  initial?: VideoOrientation;
  /** Set to false to keep the player's shape, and only report the video's. */
  resize?: boolean;
}

/** Closer to square than this reads as square, since sources round their sizes. */
const SQUARE = 0.05;

const orientationOf = (ratio: number): VideoOrientation =>
  Math.abs(ratio - 1) <= SQUARE ? "square" : ratio < 1 ? "portrait" : "landscape";

/** Gives the player the shape of its video, so a vertical video needs no setup. */
export const orientation = definePlugin("orientation", (options: OrientationOptions = {}) => ({
  state: () => ({
    /** The video's shape, or the `initial` option until it's known. */
    orientation: (options.initial ?? null) as VideoOrientation | null,
    /** The video's width divided by its height, or null until it's known. */
    ratio: null as number | null,
  }),
  attrs: { "data-orientation": (state) => state.orientation },
  attach(context, element, scope) {
    const measure = () => {
      const { videoWidth: width, videoHeight: height } = element;
      // An ad can share this element, and shouldn't reshape the player around itself.
      if (!width || !height || context.media().timeline.kind === "ad") return;
      const ratio = width / height;
      context.set({ orientation: orientationOf(ratio), ratio });
      if (options.resize === false) return;
      context.root()?.style.setProperty("--rv-aspect", `${width} / ${height}`);
    };
    scope.on(element, "loadedmetadata", measure);
    scope.on(element, "resize", measure);
    measure();
  },
}));
