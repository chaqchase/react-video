import type { DeveloperErrorCode, KnownVideoErrorCode, MediaErrorInfo, VideoErrorCode } from "./types";

export { VideoKitError, type VideoKitErrorOptions } from "./kit-error";
export type { DeveloperErrorCode, KnownVideoErrorCode, MediaErrorInfo, VideoErrorCode } from "./types";

export interface ErrorCodeInfo {
  /** True when this error stops playback. */
  fatal: boolean;
  /** True when trying again could work, so `recovery` retries it and the overlay offers **Try again**. */
  retryable: boolean;
}

const fatal = (retryable: boolean): ErrorCodeInfo => ({ fatal: true, retryable });
const notice: ErrorCodeInfo = { fatal: false, retryable: false };

/** Every code the player and its plugins report on `media.error` and `onError`. */
export const ERROR_CODES: Readonly<Record<KnownVideoErrorCode, ErrorCodeInfo>> = {
  "media-aborted": fatal(true),
  "media-network": fatal(true),
  "media-decode": fatal(false),
  "media-unsupported": fatal(false),
  "media-unknown": fatal(false),
  "source-no-provider": fatal(false),
  "source-load-failed": fatal(true),
  "play-blocked": notice,
  "play-failed": notice,
  "quality-switch": notice,
  "hls-engine-load": fatal(true),
  "hls-manifest": fatal(true),
  "hls-manifest-invalid": fatal(false),
  "hls-playlist": fatal(true),
  "hls-segment": fatal(true),
  "hls-key": fatal(true),
  "hls-network": fatal(true),
  "hls-codecs": fatal(false),
  "hls-media": fatal(false),
  "hls-unknown": fatal(false),
  "dash-engine-load": fatal(true),
  "dash-manifest": fatal(true),
  "dash-manifest-invalid": fatal(false),
  "dash-segment": fatal(true),
  "dash-network": fatal(true),
  "dash-unsupported": fatal(false),
  "dash-media": fatal(false),
  "dash-captions": notice,
  "dash-time-sync": notice,
  "dash-unknown": fatal(false),
  "drm-unsupported": fatal(false),
  "drm-config": fatal(false),
  "drm-certificate": fatal(true),
  "drm-license": fatal(true),
  "drm-denied": fatal(false),
  "drm-session": fatal(false),
  "drm-output-restricted": fatal(false),
  "drm-expired": fatal(false),
  "ads-setup": notice,
  "ads-request": notice,
  "ads-timeout": notice,
  "ads-playback": notice,
  "cast-sdk": notice,
  "cast-session": notice,
  "cast-load": notice,
};

/** Every code on a `VideoKitError` the library throws for a mistake in the code using it. */
export const DEVELOPER_ERROR_CODES: readonly DeveloperErrorCode[] = [
  "plugin-reserved-name",
  "plugin-duplicate",
  "plugin-no-code",
  "plugin-cycle",
  "plugin-missing",
  "plugin-not-installed",
  "part-outside-root",
  "part-outside-menu",
  "part-outside-radio-group",
  "part-outside-timeline",
  "provider-no-element",
];

/**
 * Whether trying again could work, from an error or a code. An error's own
 * `retryable` wins, and a code this library doesn't know is taken as not retryable.
 */
export function isRetryable(error: MediaErrorInfo | VideoErrorCode): boolean {
  if (typeof error !== "string" && error.retryable !== undefined) return error.retryable;
  const code = typeof error === "string" ? error : error.code;
  return (ERROR_CODES as Record<string, ErrorCodeInfo | undefined>)[code]?.retryable ?? false;
}
