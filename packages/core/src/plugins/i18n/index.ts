import { definePlugin } from "../../core/plugin";

/** Every string the built-in parts and plugins show or announce. */
export interface Strings {
  play?: string;
  pause?: string;
  replay?: string;
  seek?: string;
  of?: string;
  mute?: string;
  unmute?: string;
  muted?: string;
  unmuted?: string;
  volume?: string;
  settings?: string;
  fullscreen?: string;
  exitFullscreen?: string;
  pip?: string;
  exitPip?: string;
  error?: string;
  retry?: string;
  speed?: string;
  normal?: string;
  quality?: string;
  auto?: string;
  captions?: string;
  captionsOff?: string;
  audio?: string;
  chapters?: string;
  seekBy?: string;
  tapToUnmute?: string;
  live?: string;
  goLive?: string;
  next?: string;
  previous?: string;
  upNext?: string;
  playNow?: string;
  cancel?: string;
  airplay?: string;
  cast?: string;
  castingTo?: string;
  ad?: string;
  skipAd?: string;
  skipAdIn?: string;
  learnMore?: string;
}

export interface I18nOptions {
  /** A BCP 47 tag, such as "ar" or "pt-BR". */
  locale: string;
  /** Strings for that locale. Anything missing falls back to English. */
  strings?: Strings;
  /** Text direction. Worked out from `locale` when not given. */
  dir?: "ltr" | "rtl";
}

const RTL_LANGUAGES = new Set(["ar", "dv", "fa", "he", "ks", "ps", "sd", "ug", "ur", "yi"]);

const directionOf = (locale: string) =>
  RTL_LANGUAGES.has(locale.toLowerCase().split("-")[0] ?? "") ? "rtl" : "ltr";

/**
 * Translates the controls and sets their direction. `dir` is a Root attribute, so
 * it's already right in the server's HTML.
 */
export const i18n = definePlugin("i18n", (options: I18nOptions) => ({
  state: () => ({
    locale: options.locale,
    strings: (options.strings ?? {}) as Record<string, string>,
    dir: options.dir ?? directionOf(options.locale),
  }),
  attrs: {
    dir: (state) => state.dir,
    lang: (state) => state.locale,
  },
  commands: (context) => ({
    /** Switches language while playing. */
    setLocale(locale: string, strings: Strings = {}, dir?: "ltr" | "rtl") {
      context.set({
        locale,
        strings: strings as Record<string, string>,
        dir: dir ?? directionOf(locale),
      });
    },
  }),
}));
