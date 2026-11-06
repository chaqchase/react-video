import sizes from "./generated/sizes.json";

type Named = Record<string, number>;

export const standalone: Named = sizes.standalone;
export const marginal: Named = sizes.marginal;

/** What every player pays: the kernel, the native provider, `Root`, and `Media`. */
export const KERNEL = standalone["kernel (Root, Media)"] as number;
/** The whole default layout, with no plugins. */
export const LAYOUT = standalone["player layout, no plugins"] as number;
/** The layout with `defaultPlugins()`. */
export const COMPLETE = standalone["complete player"] as number;
export const STYLES = standalone["styles.css"] as number;

export const kb = (bytes: number, digits = 1) => `${(bytes / 1000).toFixed(digits)} KB`;
export const bytesLabel = (bytes: number) => (bytes < 1000 ? `${bytes} B` : kb(bytes));
/** A smaller layout, composed from parts. */
export const MINIMAL_LAYOUT = sizes.layouts.minimal;
