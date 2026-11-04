import type { AnyPlugin } from "../core/types";
import { fullscreen } from "../plugins/fullscreen/index";
import { gestures } from "../plugins/gestures/index";
import { idle } from "../plugins/idle/index";
import { pip } from "../plugins/pip/index";

/** What `VideoPlayer` installs when it isn't given a `plugins` prop. */
export function defaultPlugins(): AnyPlugin[] {
  return [idle(), gestures(), pip(), fullscreen()];
}
