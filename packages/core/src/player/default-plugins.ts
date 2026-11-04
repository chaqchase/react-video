import type { AnyPlugin } from "../core/types";
import { captions } from "../plugins/captions/index";
import { fullscreen } from "../plugins/fullscreen/index";
import { gestures } from "../plugins/gestures/index";
import { hotkeys } from "../plugins/hotkeys/index";
import { idle } from "../plugins/idle/index";
import { pip } from "../plugins/pip/index";
import { quality } from "../plugins/quality/index";
import { recovery } from "../plugins/recovery/index";
import { speed } from "../plugins/speed/index";

/** What `VideoPlayer` installs when it isn't given a `plugins` prop. */
export function defaultPlugins(): AnyPlugin[] {
  return [
    idle(),
    gestures(),
    hotkeys(),
    recovery(),
    captions(),
    speed(),
    quality(),
    pip(),
    fullscreen(),
  ];
}
