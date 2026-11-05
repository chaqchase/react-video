import type { LoadRequest, ProviderEntry, Rendition } from "../../core/types";
import { NativeProvider } from "./index";

function renditionId(rendition: Rendition, index: number) {
  return rendition.label ?? (rendition.height ? `${rendition.height}p` : String(index));
}

/**
 * Adds switching between progressive files of one video. Separate from the native
 * provider so only players that install the quality plugin pay for it.
 */
export class RenditionProvider extends NativeProvider {
  private renditions: readonly Rendition[] = [];
  private activeRendition = -1;
  private switchScope: AbortController | null = null;

  override async load(request: LoadRequest) {
    this.renditions = request.renditions ?? [];
    this.activeRendition = request.initialRendition ?? (this.renditions.length ? 0 : -1);
    this.publishQualities();
    await super.load(request);
  }

  /** Swaps renditions, keeping position and play state. */
  setQuality(id: string | "auto") {
    const element = this.element;
    if (!element || id === "auto") return;
    const next = this.renditions.findIndex(
      (rendition, index) => renditionId(rendition, index) === id
    );
    const target = this.renditions[next];
    if (!target || next === this.activeRendition) return;

    const previous = this.renditions[this.activeRendition];
    const resume = {
      time: element.currentTime,
      playing: !element.paused,
      rate: element.playbackRate,
    };

    this.switchScope?.abort();
    const controller = new AbortController();
    this.switchScope = controller;
    this.ignoreElementErrors = true;

    const swap = (rendition: Rendition) => {
      element.src = rendition.src;
      element.load();
    };

    const restore = () => {
      element.currentTime = resume.time;
      element.playbackRate = resume.rate;
    };

    const resumePlayback = () => {
      this.ignoreElementErrors = false;
      this.switchScope = null;
      if (resume.playing) element.play().catch(() => {});
      this.sink?.sync();
    };

    const options = { signal: controller.signal, once: true };
    element.addEventListener("loadedmetadata", restore, options);
    element.addEventListener(
      "canplay",
      () => {
        this.activeRendition = next;
        this.source = { src: target.src, type: target.type };
        this.publishQualities();
        controller.abort();
        resumePlayback();
      },
      options
    );
    element.addEventListener(
      "error",
      () => {
        // Keep the viewer on the rendition that worked, and report the failure.
        const message = `Couldn't switch to ${id}.`;
        controller.abort();
        if (previous) {
          const revert = new AbortController();
          this.switchScope = revert;
          const revertOptions = { signal: revert.signal, once: true };
          element.addEventListener("loadedmetadata", restore, revertOptions);
          element.addEventListener(
            "canplay",
            () => {
              revert.abort();
              resumePlayback();
            },
            revertOptions
          );
          swap(previous);
        } else {
          this.ignoreElementErrors = false;
        }
        this.sink?.error({ code: "quality-switch", message, fatal: false, retryable: false });
      },
      options
    );

    swap(target);
  }

  override destroy() {
    this.switchScope?.abort();
    super.destroy();
  }

  private publishQualities() {
    if (this.renditions.length === 0) return;
    const active = this.renditions[this.activeRendition];
    this.sink?.update({
      qualities: this.renditions.map((rendition, index) => ({
        id: renditionId(rendition, index),
        label: rendition.label,
        width: rendition.width,
        height: rendition.height,
        bitrate: rendition.bitrate,
      })),
      quality: {
        mode: "manual",
        active: active ? renditionId(active, this.activeRendition) : null,
      },
    });
  }
}

/** For the quality plugin, which only claims sources that have renditions. */
export function renditionProviderEntry(hasRenditions: () => boolean): ProviderEntry {
  return {
    name: "renditions",
    canPlay: hasRenditions,
    load: () => Promise.resolve(RenditionProvider),
  };
}
