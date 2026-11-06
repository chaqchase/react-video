import type { AnalyticsEvent, AnalyticsEventType } from "./index";

/** The parameters sent with an event. */
export type GoogleAnalyticsParams = Record<string, string | number | boolean | undefined>;

/** Optional events beyond Google's own video events. */
export type GoogleAnalyticsExtra = "pause" | "seek" | "rebuffer" | "quality-change" | "error";

export interface GoogleAnalyticsOptions {
  /** Sends only to this measurement ID, as `send_to`, for a page with more than one. */
  measurementId?: string;
  /** The `video_title`, or a function to work it out from the event. */
  title?: string | ((event: AnalyticsEvent) => string | undefined);
  /** The `video_provider`. Defaults to `react-video-kit`. */
  provider?: string;
  /** Turns on events beyond `video_start`, `video_progress`, and `video_complete`. */
  events?: readonly GoogleAnalyticsExtra[];
  /**
   * Turns the source into `video_url`. By default that drops the query string and hash,
   * which may hold tokens. Return `undefined` to send no URL.
   */
  url?: (source: string) => string | undefined;
  /** Sends the event yourself, in place of `gtag` or `dataLayer`. */
  send?: (name: string, params: GoogleAnalyticsParams) => void;
}

interface GoogleGlobals {
  gtag?: (command: "event", name: string, params: GoogleAnalyticsParams) => void;
  dataLayer?: { push(entry: object): unknown };
}

const whole = (value: number) => (Number.isFinite(value) ? Math.round(value) : undefined);

const withoutQuery = (source: string) => source.split(/[?#]/)[0];

/** Uses what's on the page, and does nothing where there's neither, as on a server. */
function sendToPage(name: string, params: GoogleAnalyticsParams) {
  const page = globalThis as GoogleGlobals;
  if (typeof page.gtag === "function") page.gtag("event", name, params);
  else page.dataLayer?.push({ event: name, ...params });
}

const EXTRAS: Partial<Record<AnalyticsEventType, [GoogleAnalyticsExtra, string]>> = {
  pause: ["pause", "video_pause"],
  seek: ["seek", "video_seek"],
  "rebuffer-end": ["rebuffer", "video_rebuffer"],
  "quality-change": ["quality-change", "video_quality_change"],
  error: ["error", "video_error"],
};

/**
 * Sends the `analytics` plugin's events to Google Analytics 4 under Google's own names
 * for video. It uses the `gtag` or `dataLayer` already on the page: it never loads
 * Google's script or changes consent, which stay with your site. Keeps no state, so
 * players can share one.
 */
export function googleAnalytics(options: GoogleAnalyticsOptions = {}) {
  const { measurementId, title, provider = "react-video-kit", events = [], url = withoutQuery, send = sendToPage } = options;

  return (event: AnalyticsEvent): void => {
    const { type } = event;
    let name: string | undefined;
    let extra: GoogleAnalyticsParams | undefined;
    if (type === "start") name = "video_start";
    else if (type === "progress") name = "video_progress";
    else if (type === "ended" && event.complete) name = "video_complete";
    else {
      const optional = EXTRAS[type];
      if (!optional || !events.includes(optional[0])) return;
      name = optional[1];
      if (type === "rebuffer-end") extra = { stalled_ms: whole(event.stalledMs ?? 0) };
      if (type === "quality-change") extra = { video_quality: event.quality ?? undefined };
      // Only the code: a message or URL could hold something private.
      if (type === "error") extra = { error_code: event.error?.code, error_fatal: event.error?.fatal };
    }

    send(name, {
      video_current_time: whole(event.position),
      video_duration: whole(event.duration),
      video_percent: type === "ended" ? 100 : event.percent,
      video_provider: provider,
      video_title: typeof title === "function" ? title(event) : title,
      video_url: event.source === null ? undefined : url(event.source),
      visible: typeof document === "undefined" || document.visibilityState === "visible",
      ...extra,
      ...(measurementId && { send_to: measurementId }),
    });
  };
}
