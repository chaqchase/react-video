// Only data, so that listing the themes doesn't pull their CSS into every page.
export const THEMES = [
  { id: "default", label: "Apple TV" },
  { id: "youtube", label: "YouTube" },
  { id: "netflix", label: "Netflix" },
  { id: "disney", label: "Disney+" },
  { id: "prime", label: "Prime Video" },
  { id: "max", label: "HBO Max" },
  { id: "hulu", label: "Hulu" },
  { id: "vimeo", label: "Vimeo" },
  { id: "twitch", label: "Twitch" },
  { id: "spotify", label: "Spotify" },
  { id: "udemy", label: "Udemy" },
  { id: "tiktok", label: "TikTok", vertical: true },
  { id: "instagram", label: "Instagram", vertical: true },
  { id: "minimal", label: "Minimal" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const themeClass = (theme: ThemeId) => (theme === "default" ? undefined : `rv-theme-${theme}`);

/** The themes built for vertical video, which look their best with some. */
export const isVerticalTheme = (theme: ThemeId) =>
  THEMES.some((entry) => entry.id === theme && "vertical" in entry);
