import { test as base } from "@playwright/test";

export { expect, type Locator, type Page } from "@playwright/test";

// The real volume stays at 0 while the page sees the volume it set, so volume tests still work.
function silence() {
  const { prototype } = HTMLMediaElement;
  const { set } = Object.getOwnPropertyDescriptor(prototype, "volume")!;
  const { play } = prototype;
  const volumes = new WeakMap<HTMLMediaElement, number>();
  Object.defineProperty(prototype, "volume", {
    get(this: HTMLMediaElement) {
      return volumes.get(this) ?? 1;
    },
    set(this: HTMLMediaElement, volume: number) {
      if (volume < 0 || volume > 1) throw new DOMException("Volume out of range", "IndexSizeError");
      if (volume === this.volume) return;
      volumes.set(this, volume);
      this.dispatchEvent(new Event("volumechange"));
    },
  });
  prototype.play = function (this: HTMLMediaElement) {
    set!.call(this, 0);
    return play.call(this);
  };
}

export const test = base.extend({
  context: async ({ context, browserName }, provide) => {
    if (browserName === "webkit") await context.addInitScript(silence);
    await provide(context);
  },
});
