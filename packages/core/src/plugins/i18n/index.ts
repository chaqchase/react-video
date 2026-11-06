import { definePlugin } from "../../core/plugin";

/** Every string the built-in parts and plugins show or announce. */
export interface Strings {
  /** The label on the play buttons, and the hotkey message for playing. */
  play?: string;
  /** The label on the play button during playback, and the hotkey message for pausing. */
  pause?: string;
  /** The label on the play buttons once the video has ended. */
  replay?: string;
  /** The label on a backward seek button, where `{seconds}` stands for the amount. */
  seekBack?: string;
  /** The label on a forward seek button, where `{seconds}` stands for the amount. */
  seekForward?: string;
  /** The label on the timeline's slider. */
  seek?: string;
  /** The word between the two times the timeline announces, as in `1:00 of 5:00`. */
  of?: string;
  /** The label on the mute button while the sound is on. */
  mute?: string;
  /** The label on the mute button while muted. */
  unmute?: string;
  /** The hotkey message after muting. */
  muted?: string;
  /** The hotkey message after unmuting. */
  unmuted?: string;
  /** The label on the volume slider, and the start of the hotkey message for volume. */
  volume?: string;
  /** The label on the settings menu button. */
  settings?: string;
  /** The name of the player itself, for screen readers, where it has no other. */
  player?: string;
  /** Announced when the video has been stalled for a few seconds. */
  buffering?: string;
  /** The name of the transcript's list of lines. */
  transcript?: string;
  /** The label on the back row of a submenu. */
  back?: string;
  /** The label on the fullscreen button outside fullscreen. */
  fullscreen?: string;
  /** The label on the fullscreen button while in fullscreen. */
  exitFullscreen?: string;
  /** The label on the picture-in-picture button outside picture-in-picture. */
  pip?: string;
  /** The label on the picture-in-picture button while in picture-in-picture. */
  exitPip?: string;
  /** The title on the error overlay when a video can't be played. */
  error?: string;
  /** The line under that title. */
  errorDetail?: string;
  /** The title on the error overlay when trying again could work. */
  errorConnection?: string;
  /** The line under that title. */
  errorConnectionDetail?: string;
  /** The title on the error overlay when protected video can't be played. */
  errorProtected?: string;
  /** The line under that title. */
  errorProtectedDetail?: string;
  /** The title on the error overlay when the viewer isn't allowed to watch. */
  errorDenied?: string;
  /** The line under that title. */
  errorDeniedDetail?: string;
  /** The title on the error overlay when protection rules out this display. */
  errorOutput?: string;
  /** The line under that title. */
  errorOutputDetail?: string;
  /** The words before the code on the error overlay, with their punctuation. */
  errorCode?: string;
  /** The label on the error overlay's retry button. */
  retry?: string;
  /** The name of the speed row and its submenu in the settings menu. */
  speed?: string;
  /** The name of the 1× rate in the speed menu. */
  normal?: string;
  /** The name of the quality row and its submenu in the settings menu. */
  quality?: string;
  /** The name of the automatic choice in the quality menu. */
  auto?: string;
  /** The label on the captions button, and the name of the captions row in the settings menu. */
  captions?: string;
  /** The name of the off choice in the captions menu. */
  captionsOff?: string;
  /** The name of the audio row and its submenu in the settings menu. */
  audio?: string;
  /** The name of the chapters row and its submenu in the settings menu. */
  chapters?: string;
  /** The text on the chip offering sound after a muted autoplay. */
  tapToUnmute?: string;
  /** The text on the live indicator. */
  live?: string;
  /** The label on the live indicator when behind the edge or paused. */
  goLive?: string;
  /** The label on the playlist's next button. */
  next?: string;
  /** The label on the playlist's previous button. */
  previous?: string;
  /** The heading on the up-next card. */
  upNext?: string;
  /** The label on the up-next card's button that plays the next item. */
  playNow?: string;
  /** The label on the up-next card's button that stays on the finished video. */
  cancel?: string;
  /** The label on the AirPlay button. */
  airplay?: string;
  /** The label on the Cast button. */
  cast?: string;
  /** The text before the device name on the casting overlay. */
  castingTo?: string;
  /** The word before the count and time left on the ad overlay. */
  ad?: string;
  /** The label on the ad overlay's skip button once skipping is allowed. */
  skipAd?: string;
  /** The text before the seconds on the skip button until skipping is allowed. */
  skipAdIn?: string;
  /** The text on the ad overlay's link. */
  learnMore?: string;
  /** The label on the episodes button and shelf. */
  episodes?: string;
  /** Marks the episode that's playing on the shelf. */
  nowPlaying?: string;
  /** The label on a panel's close button. */
  close?: string;
  /** The label on the info button and panel. */
  info?: string;
  /** The skip button during an intro. */
  skipIntro?: string;
  /** The skip button during a recap. */
  skipRecap?: string;
  /** The skip button during credits, with nothing to move on to. */
  skipCredits?: string;
  /** The skip button during any other part. */
  skip?: string;
  /** The skip button during credits, with another item in the playlist. */
  nextEpisode?: string;
  /** The name of the ambient light row in the settings menu. */
  ambient?: string;
  /** The label on the mini player's button that scrolls back to the video. */
  backToVideo?: string;
  /** The name of the row that saves the current frame. */
  screenshot?: string;
  /** The message after saving a frame. */
  screenshotSaved?: string;
  /** The message when a frame can't be saved. */
  screenshotFailed?: string;
  /** The name of the loop row and its submenu in the settings menu. */
  loop?: string;
  /** The choice in the loop menu that repeats the whole video. */
  loopVideo?: string;
  /** The row in the loop menu that starts a section at the current position. */
  loopStart?: string;
  /** The row in the loop menu that ends a section at the current position. */
  loopEnd?: string;
  /** The title of the shortcuts list, and its row in the settings menu. */
  shortcuts?: string;
  /** The name of the play and pause shortcut. */
  shortcutPlayPause?: string;
  /** The name of the shortcut that raises the volume. */
  shortcutVolumeUp?: string;
  /** The name of the shortcut that lowers the volume. */
  shortcutVolumeDown?: string;
  /** The name of the mute shortcut. */
  shortcutMute?: string;
  /** The name of the shortcut that speeds playback up. */
  shortcutFaster?: string;
  /** The name of the shortcut that slows playback down. */
  shortcutSlower?: string;
  /** The name of the shortcut to the start. */
  shortcutStart?: string;
  /** The name of the shortcut to the end. */
  shortcutEnd?: string;
  /** The name of the number keys, which jump through the video. */
  shortcutJump?: string;
  /** The title of the stats readout, and its row in the settings menu. */
  stats?: string;
  /** The stats row for the picture's size. */
  statsVideo?: string;
  /** The stats row for the player's size on the page. */
  statsViewport?: string;
  /** The stats row for dropped frames. */
  statsFrames?: string;
  /** The stats row for how much is downloaded ahead. */
  statsBuffer?: string;
  /** The stats row for the active provider. */
  statsEngine?: string;
  /** The stats row for the distance from the live edge. */
  statsLatency?: string;
  /** The label on the stats readout's copy button. */
  copy?: string;
  /** The label on that button just after copying. */
  copied?: string;
  /** The label on the share button. */
  share?: string;
  /** The message after copying a link. */
  linkCopied?: string;
  /** The message when a link can't be copied. */
  linkFailed?: string;
  /** The label on the fit button while the whole picture shows. */
  fill?: string;
  /** The label on the fit button while the picture fills the frame. */
  fitWhole?: string;
  /** The label on the transcript's button that returns to the current line. */
  transcriptResume?: string;
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
    /** The current language, written to Root as `lang`. */
    locale: options.locale,
    /** Translations for that language, where anything missing falls back to English. */
    strings: (options.strings ?? {}) as Record<string, string>,
    /** The text direction, written to Root as `dir`. */
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
