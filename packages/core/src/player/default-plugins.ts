import type { AnyPlugin } from "../core/types";
import { captions } from "../plugins/captions/index";
import { fullscreen } from "../plugins/fullscreen/index";
import { gestures } from "../plugins/gestures/index";
import { hotkeys } from "../plugins/hotkeys/index";
import { idle } from "../plugins/idle/index";
import { orientation } from "../plugins/orientation/index";
import { pip } from "../plugins/pip/index";
import { quality } from "../plugins/quality/index";
import { recovery } from "../plugins/recovery/index";
import { speed } from "../plugins/speed/index";

/** A sensible set for `VideoPlayer`: controls that hide, gestures, keys, and the usual menus. */
export function defaultPlugins(): AnyPlugin[] {
  return [
    orientation(),
    idle(),
    gestures(),
    hotkeys(),
    recovery(),
    captions(),
    speed(),
    quality(),
    fullscreen(),
    pip(),
  ];
}
