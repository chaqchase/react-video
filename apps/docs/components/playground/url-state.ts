// Pure, so the server can read a shared link and render the same player first time.
export type SourceId = "mp4" | "hls" | "dash" | "live" | "dvr" | "drm";
export type Layout = "complete" | "minimal";
export type Aspect = "16/9" | "4/3" | "1/1" | "9/16";
export type StageWidth = "phone" | "tablet" | "full";

export interface Tokens {
  accent: string;
  radius: number;
  blur: number;
  control: number;
}

export interface PlaygroundState {
  source: SourceId;
  plugins: string[];
  layout: Layout;
  tokens: Tokens;
  aspect: Aspect;
  width: StageWidth;
}

export const DEFAULTS: PlaygroundState = {
  source: "mp4",
  plugins: ["idle", "gestures", "hotkeys", "recovery", "captions", "speed", "quality", "pip", "fullscreen"],
  layout: "complete",
  tokens: { accent: "#ffffff", radius: 16, blur: 22, control: 36 },
  aspect: "16/9",
  width: "full",
};

const oneOf = <Value extends string>(value: string | null, allowed: readonly Value[], fallback: Value) =>
  allowed.includes(value as Value) ? (value as Value) : fallback;

const number = (value: string | null, min: number, max: number, fallback: number) => {
  const parsed = value === null ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
};

export function parseConfig(params: URLSearchParams): PlaygroundState {
  const accent = params.get("accent");
  const plugins = params.get("p");
  return {
    source: oneOf(params.get("s"), ["mp4", "hls", "dash", "live", "dvr", "drm"], DEFAULTS.source),
    plugins: plugins === null ? DEFAULTS.plugins : plugins.split(",").filter(Boolean),
    layout: oneOf(params.get("l"), ["complete", "minimal"], DEFAULTS.layout),
    aspect: oneOf(params.get("a"), ["16/9", "4/3", "1/1", "9/16"], DEFAULTS.aspect),
    width: oneOf(params.get("w"), ["phone", "tablet", "full"], DEFAULTS.width),
    tokens: {
      accent: accent && /^[0-9a-f]{6}$/i.test(accent) ? `#${accent}` : DEFAULTS.tokens.accent,
      radius: number(params.get("r"), 0, 36, DEFAULTS.tokens.radius),
      blur: number(params.get("b"), 0, 48, DEFAULTS.tokens.blur),
      control: number(params.get("c"), 28, 48, DEFAULTS.tokens.control),
    },
  };
}

/** Only what differs from the defaults, so links stay short enough to share. */
export function serializeConfig(state: PlaygroundState) {
  const params = new URLSearchParams();
  const set = (key: string, value: string, fallback: string) => {
    if (value !== fallback) params.set(key, value);
  };
  set("s", state.source, DEFAULTS.source);
  set("p", [...state.plugins].sort().join(","), [...DEFAULTS.plugins].sort().join(","));
  set("l", state.layout, DEFAULTS.layout);
  set("a", state.aspect, DEFAULTS.aspect);
  set("w", state.width, DEFAULTS.width);
  set("accent", state.tokens.accent.slice(1), DEFAULTS.tokens.accent.slice(1));
  set("r", String(state.tokens.radius), String(DEFAULTS.tokens.radius));
  set("b", String(state.tokens.blur), String(DEFAULTS.tokens.blur));
  set("c", String(state.tokens.control), String(DEFAULTS.tokens.control));
  const query = params.toString();
  return query ? `?${query}` : "";
}
