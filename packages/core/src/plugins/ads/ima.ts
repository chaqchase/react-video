import type { AdEngine, AdHost } from "./engine";

const SDK_URL = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";

interface ImaAd {
  getDuration(): number;
  getSkipTimeOffset(): number;
  getAdPodInfo(): { getAdPosition(): number; getTotalAds(): number };
}
interface ImaEvent {
  getAd(): ImaAd | null;
  getError?(): unknown;
}
interface ImaManager {
  addEventListener(type: string, listener: (event: ImaEvent) => void): void;
  init(width: number, height: number, mode: unknown): void;
  start(): void;
  pause(): void;
  resume(): void;
  skip(): void;
  setVolume(volume: number): void;
  getRemainingTime(): number;
  destroy(): void;
}
interface Ima {
  AdDisplayContainer: new (container: HTMLElement, video: HTMLVideoElement) => {
    initialize(): void;
    destroy(): void;
  };
  AdsLoader: new (container: unknown) => {
    addEventListener(type: string, listener: (event: never) => void): void;
    requestAds(request: unknown): void;
    contentComplete(): void;
    destroy(): void;
  };
  AdsRequest: new () => {
    adTagUrl: string;
    linearAdSlotWidth: number;
    linearAdSlotHeight: number;
    nonLinearAdSlotWidth: number;
    nonLinearAdSlotHeight: number;
  };
  AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: string } };
  AdErrorEvent: { Type: { AD_ERROR: string } };
  AdEvent: {
    Type: {
      CONTENT_PAUSE_REQUESTED: string;
      CONTENT_RESUME_REQUESTED: string;
      STARTED: string;
      ALL_ADS_COMPLETED: string;
    };
  };
  ViewMode: { NORMAL: unknown };
}

const imaOf = () => (globalThis as unknown as { google?: { ima?: Ima } }).google?.ima;

function loadSdk(url: string) {
  if (imaOf() || document.querySelector(`script[src="${url}"]`)) return;
  const script = document.createElement("script");
  script.src = url;
  script.async = true;
  document.head.append(script);
}

export interface ImaOptions {
  /** The ad tag's URL. */
  tag: string;
  /** Where to load the IMA SDK from. */
  sdkUrl?: string;
}

/**
 * Google's Interactive Media Ads SDK, which AdSense and Ad Manager require. It loads
 * with the source, because it must be ready by the first play's gesture, and it draws
 * its own countdown and skip button. If an ad blocker stops it, the content plays.
 */
export function ima(options: ImaOptions) {
  const { tag, sdkUrl = SDK_URL } = options;

  return (): AdEngine => {
    if (typeof document !== "undefined") loadSdk(sdkUrl);
    let manager: ImaManager | null = null;
    let host: AdHost | null = null;
    let display: InstanceType<Ima["AdDisplayContainer"]> | null = null;
    let loader: InstanceType<Ima["AdsLoader"]> | null = null;
    let duration = 0;

    return {
      ownsUi: true,
      get time() {
        return manager ? Math.max(duration - manager.getRemainingTime(), 0) : 0;
      },
      prepare(next) {
        host = next;
        const sdk = imaOf();
        if (!sdk) throw new Error("The IMA SDK didn't load.");
        display = new sdk.AdDisplayContainer(next.container, next.video);
        display.initialize();
      },
      request() {
        const sdk = imaOf();
        const active = host;
        if (!sdk || !display || !active) return Promise.reject(new Error("IMA wasn't prepared."));
        const container = active.container;

        return new Promise<void>((resolve, reject) => {
          const next = new sdk.AdsLoader(display);
          loader = next;
          next.addEventListener(sdk.AdErrorEvent.Type.AD_ERROR, (event: ImaEvent) => {
            active.breakEnd();
            reject(event.getError?.() ?? new Error("IMA reported an error."));
          });
          next.addEventListener(
            sdk.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            (event: { getAdsManager(video: HTMLVideoElement): ImaManager }) => {
              const loaded = event.getAdsManager(active.video);
              manager = loaded;
              const { AdEvent, AdErrorEvent, ViewMode } = sdk;
              loaded.addEventListener(AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
                active.breakStart();
                resolve();
              });
              loaded.addEventListener(AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
                active.breakEnd();
              });
              loaded.addEventListener(AdEvent.Type.ALL_ADS_COMPLETED, () => resolve());
              loaded.addEventListener(AdEvent.Type.STARTED, (started) => {
                const ad = started.getAd();
                if (!ad) return;
                duration = ad.getDuration();
                const offset = ad.getSkipTimeOffset();
                const pod = ad.getAdPodInfo();
                active.adStart({
                  duration,
                  skipAfter: offset >= 0 ? offset : null,
                  position: pod.getAdPosition(),
                  total: pod.getTotalAds(),
                });
              });
              loaded.addEventListener(AdErrorEvent.Type.AD_ERROR, (failed) => {
                active.error(failed.getError?.() ?? new Error("IMA reported an error."));
                active.breakEnd();
                resolve();
              });
              const { offsetWidth, offsetHeight } = container;
              loaded.init(offsetWidth, offsetHeight, ViewMode.NORMAL);
              loaded.start();
            }
          );
          const request = new sdk.AdsRequest();
          request.adTagUrl = tag;
          request.linearAdSlotWidth = container.offsetWidth;
          request.linearAdSlotHeight = container.offsetHeight;
          request.nonLinearAdSlotWidth = container.offsetWidth;
          request.nonLinearAdSlotHeight = Math.round(container.offsetHeight / 3);
          next.requestAds(request);
        });
      },
      play() {
        manager?.resume();
      },
      pause() {
        manager?.pause();
      },
      skip() {
        manager?.skip();
      },
      setVolume(volume, muted) {
        manager?.setVolume(muted ? 0 : volume);
      },
      contentEnded() {
        loader?.contentComplete();
      },
      destroy() {
        manager?.destroy();
        loader?.destroy();
        display?.destroy();
        host?.container.remove();
        manager = null;
        loader = null;
        display = null;
        host = null;
      },
    };
  };
}
