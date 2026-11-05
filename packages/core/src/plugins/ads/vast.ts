import type { AdEngine, AdHost, AdInfo } from "./engine";

export interface VastOptions {
  /** The VAST tag's URL. */
  tag: string;
  /** How many wrapper redirects to follow. */
  maxRedirects?: number;
}

interface VastAd {
  media: string;
  duration: number;
  skipAfter: number | null;
  clickThrough: string | null;
  impressions: string[];
  tracking: Map<string, string[]>;
  clicks: string[];
}

const textOf = (element: Element | null | undefined) => element?.textContent?.trim() ?? "";

/** Reads `HH:MM:SS.mmm`, as VAST writes durations. */
const seconds = (value: string) =>
  value.split(":").reduce((total, part) => total * 60 + Number(part), 0);

/** A skip offset is a time, or a percentage of the ad's length. */
const offsetOf = (value: string, duration: number) =>
  value.endsWith("%") ? (duration * Number.parseFloat(value)) / 100 : seconds(value);

const urls = (parent: Element, selector: string) =>
  [...parent.querySelectorAll(selector)].map(textOf).filter(Boolean);

function trackingOf(parent: Element) {
  const tracking = new Map<string, string[]>();
  for (const event of parent.querySelectorAll("Tracking")) {
    const name = event.getAttribute("event");
    const url = textOf(event);
    if (!name || !url) continue;
    tracking.set(name, [...(tracking.get(name) ?? []), url]);
  }
  return tracking;
}

function mergeTracking(outer: Map<string, string[]> | undefined, inner: Map<string, string[]>) {
  const merged = new Map(inner);
  for (const [name, list] of outer ?? []) {
    merged.set(name, [...list, ...(merged.get(name) ?? [])]);
  }
  return merged;
}

/** Takes the largest file the browser can play progressively. */
function pickMedia(linear: Element) {
  const probe = document.createElement("video");
  const files = [...linear.querySelectorAll("MediaFile")]
    .filter((file) => file.getAttribute("delivery") !== "streaming")
    .filter((file) => probe.canPlayType(file.getAttribute("type") ?? "") !== "")
    .sort(
      (a, b) => Number(b.getAttribute("bitrate") ?? 0) - Number(a.getAttribute("bitrate") ?? 0)
    );
  return textOf(files[0]);
}

async function loadAds(url: string, redirects: number, signal: AbortSignal, inherited?: VastAd) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`VAST tag returned ${response.status}.`);
  const document_ = new DOMParser().parseFromString(await response.text(), "text/xml");
  const ads: VastAd[] = [];

  for (const ad of document_.querySelectorAll("VAST > Ad")) {
    const wrapper = ad.querySelector("Wrapper");
    if (wrapper) {
      const next = textOf(wrapper.querySelector("VASTAdTagURI"));
      if (!next || redirects <= 0) continue;
      ads.push(
        ...(await loadAds(next, redirects - 1, signal, {
          media: "",
          duration: 0,
          skipAfter: null,
          clickThrough: null,
          impressions: [...(inherited?.impressions ?? []), ...urls(wrapper, "Impression")],
          tracking: mergeTracking(inherited?.tracking, trackingOf(wrapper)),
          clicks: [...(inherited?.clicks ?? []), ...urls(wrapper, "ClickTracking")],
        }))
      );
      continue;
    }
    const linear = ad.querySelector("Linear");
    const media = linear ? pickMedia(linear) : "";
    if (!linear || !media) continue;
    const skipoffset = linear.getAttribute("skipoffset");
    const duration = seconds(textOf(linear.querySelector("Duration")));
    ads.push({
      media,
      duration,
      skipAfter: skipoffset ? offsetOf(skipoffset, duration) : null,
      clickThrough: textOf(linear.querySelector("ClickThrough")) || null,
      impressions: [...(inherited?.impressions ?? []), ...urls(ad, "Impression")],
      tracking: mergeTracking(inherited?.tracking, trackingOf(linear)),
      clicks: [...(inherited?.clicks ?? []), ...urls(linear, "ClickTracking")],
    });
  }
  return ads;
}

/** Tracking is fire-and-forget. An image is the one request that's never blocked by CORS. */
function ping(list: readonly string[] | undefined) {
  for (const url of list ?? []) new Image().src = url;
}

const QUARTILES: [number, string][] = [
  [0.25, "firstQuartile"],
  [0.5, "midpoint"],
  [0.75, "thirdQuartile"],
];

/**
 * Plays a VAST tag's linear pre-roll with no SDK, in a second video element over the
 * content. That needs no third-party script, but it does no viewability or
 * verification measurement, so use `ima()` for ad networks that require them.
 */
export function vast(options: VastOptions) {
  const { tag, maxRedirects = 5 } = options;

  return (): AdEngine => {
    const controller = new AbortController();
    let host: AdHost | null = null;
    let element: HTMLVideoElement | null = null;
    let finish: () => void = () => {};
    let clicks: readonly string[] = [];

    const playAd = (ad: VastAd, info: AdInfo) =>
      new Promise<void>((resolve) => {
        const video = element;
        if (!video || !host) {
          resolve();
          return;
        }
        const scope = new AbortController();
        const options_ = { signal: scope.signal };
        const pending = new Set(QUARTILES);
        const active = host;
        let started = false;
        clicks = ad.clicks;
        const done = () => {
          scope.abort();
          finish = () => {};
          clicks = [];
          resolve();
        };
        // A broken ad moves on, since the viewer must never be stuck behind it.
        const fail = (error: unknown) => {
          active.error(error);
          done();
        };
        finish = () => {
          ping(ad.tracking.get("skip"));
          done();
        };
        video.addEventListener(
          "playing",
          () => {
            if (started) return;
            started = true;
            ping(ad.impressions);
            ping(ad.tracking.get("start"));
          },
          options_
        );
        video.addEventListener(
          "timeupdate",
          () => {
            const fraction = video.currentTime / (video.duration || ad.duration);
            for (const entry of pending) {
              if (fraction < entry[0]) continue;
              pending.delete(entry);
              ping(ad.tracking.get(entry[1]));
            }
          },
          options_
        );
        video.addEventListener(
          "ended",
          () => {
            ping(ad.tracking.get("complete"));
            done();
          },
          options_
        );
        video.addEventListener(
          "error",
          () => fail(new Error(`The ad file couldn't play: ${ad.media}`)),
          options_
        );
        active.adStart(info);
        video.src = ad.media;
        video.load();
        video.play().catch((error: unknown) => {
          // Pausing the ad before it starts rejects this too, and isn't a failure.
          const aborted = error instanceof Error && error.name === "AbortError";
          if (!aborted && !scope.signal.aborted) fail(error);
        });
      });

    return {
      get time() {
        return element?.currentTime ?? 0;
      },
      prepare(next) {
        host = next;
        const video = document.createElement("video");
        video.playsInline = true;
        video.setAttribute("data-part", "ad-media");
        video.hidden = true;
        next.container.append(video);
        element = video;
        // Calling play in the gesture is what lets this element play later.
        video.play().catch(() => {});
      },
      async request() {
        const list = await loadAds(tag, maxRedirects, controller.signal);
        if (controller.signal.aborted || list.length === 0 || !host || !element) return;
        const active = host;
        const video = element;
        video.hidden = false;
        video.muted = active.video.muted;
        video.volume = active.video.volume;
        active.breakStart();
        const run = async () => {
          for (const [index, ad] of list.entries()) {
            await playAd(ad, {
              duration: ad.duration,
              skipAfter: ad.skipAfter,
              clickThrough: ad.clickThrough,
              position: index + 1,
              total: list.length,
            });
            if (controller.signal.aborted) return;
          }
          video.hidden = true;
          video.removeAttribute("src");
          active.breakEnd();
        };
        void run();
      },
      play() {
        return element?.play();
      },
      pause() {
        element?.pause();
      },
      skip() {
        finish();
      },
      clicked() {
        ping(clicks);
      },
      setVolume(volume, muted) {
        if (!element) return;
        element.volume = volume;
        element.muted = muted;
      },
      destroy() {
        controller.abort();
        finish = () => {};
        element?.remove();
        host?.container.remove();
        element = null;
        host = null;
      },
    };
  };
}
