/* global setTimeout, clearTimeout */
// Scenarios that define how a media element behaves. They run against the fake
// in unit tests and against a real <video> in every browser, so the fake can't
// drift from reality. Plain JavaScript with no imports, to load in both places.
(function (global) {
  const once = (media, type, timeout = 15000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`timed out waiting for ${type}`)),
        timeout
      );
      media.addEventListener(
        type,
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
    });

  const record = (media, types) => {
    const seen = [];
    for (const type of types) {
      media.addEventListener(type, () => seen.push(type));
    }
    return seen;
  };

  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  const before = (seen, first, second) => {
    const a = seen.indexOf(first);
    const b = seen.indexOf(second);
    assert(a !== -1, `expected ${first} in [${seen}]`);
    assert(b !== -1, `expected ${second} in [${seen}]`);
    assert(a < b, `expected ${first} before ${second} in [${seen}]`);
  };

  const load = async (media, src) => {
    const ready = once(media, "canplay");
    media.src = src;
    media.load();
    await ready;
  };

  global.__mediaContract = {
    "load reports metadata, then data, then readiness": async (media, { src }) => {
      const seen = record(media, ["loadstart", "loadedmetadata", "loadeddata", "canplay"]);
      await load(media, src);
      before(seen, "loadstart", "loadedmetadata");
      before(seen, "loadedmetadata", "loadeddata");
      before(seen, "loadeddata", "canplay");
      assert(media.duration > 0, `expected a duration, got ${media.duration}`);
    },
    "play reports play then playing and clears paused": async (media, { src }) => {
      await load(media, src);
      const seen = record(media, ["play", "playing"]);
      assert(media.paused, "should start paused");
      const playing = once(media, "playing");
      await media.play();
      await playing;
      before(seen, "play", "playing");
      assert(!media.paused, "should not be paused");
    },
    "pause reports pause and sets paused": async (media, { src }) => {
      await load(media, src);
      await media.play();
      const paused = once(media, "pause");
      media.pause();
      await paused;
      assert(media.paused, "should be paused");
    },
    "seeking reports seeking then seeked at the new position": async (media, { src }) => {
      await load(media, src);
      const seen = record(media, ["seeking", "seeked"]);
      const seeked = once(media, "seeked");
      media.currentTime = 2;
      await seeked;
      before(seen, "seeking", "seeked");
      assert(Math.abs(media.currentTime - 2) < 0.5, `at ${media.currentTime}`);
    },
    "volume and muted report volumechange": async (media, { src }) => {
      await load(media, src);
      let changed = once(media, "volumechange");
      media.volume = 0.5;
      await changed;
      assert(media.volume === 0.5, `volume ${media.volume}`);
      changed = once(media, "volumechange");
      media.muted = !media.muted;
      await changed;
    },
    "playbackRate reports ratechange": async (media, { src }) => {
      await load(media, src);
      const changed = once(media, "ratechange");
      media.playbackRate = 2;
      await changed;
      assert(media.playbackRate === 2, `rate ${media.playbackRate}`);
    },
    "playing to the end reports ended and pauses": async (media, { src, finish }) => {
      await load(media, src);
      const ended = once(media, "ended", 30000);
      media.currentTime = Math.max(0, media.duration - 0.5);
      await media.play();
      await finish?.(media);
      await ended;
      assert(media.ended, "ended should be true");
      assert(media.paused, "paused should be true after ending");
    },
    "an unusable source reports error with a code": async (media, { broken }) => {
      const failed = once(media, "error");
      media.src = broken;
      media.load();
      await failed;
      assert(media.error && media.error.code > 0, "expected MediaError code");
    },
    "removing the source does not report error": async (media, { src }) => {
      await load(media, src);
      let errored = false;
      media.addEventListener("error", () => (errored = true));
      media.removeAttribute("src");
      media.load();
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert(!errored, "should not report an error");
    },
  };
})(globalThis);
