"use client";

import { Fragment } from "react";
import { definePlugin } from "../../core/plugin";
import { labelFrom } from "../../lib/labels";
import { usePlayer } from "../../react/context";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { MenuItem } from "../../react/primitives/menu-item";
import { Panel } from "../../react/primitives/panel";
import type { hotkeys } from "../hotkeys/index";

/** The label for each binding the hotkeys plugin reports, as a key and its English. */
const NAMES: Record<string, readonly [string, string]> = {
  playPause: ["shortcutPlayPause", "Play or pause"],
  seekBack: ["seekBack", "Back {seconds} seconds"],
  seekForward: ["seekForward", "Forward {seconds} seconds"],
  seekBackLarge: ["seekBack", "Back {seconds} seconds"],
  seekForwardLarge: ["seekForward", "Forward {seconds} seconds"],
  volumeUp: ["shortcutVolumeUp", "Volume up"],
  volumeDown: ["shortcutVolumeDown", "Volume down"],
  mute: ["shortcutMute", "Mute or unmute"],
  fullscreen: ["fullscreen", "Fullscreen"],
  pip: ["pip", "Picture in picture"],
  captions: ["captions", "Captions"],
  faster: ["shortcutFaster", "Faster"],
  slower: ["shortcutSlower", "Slower"],
  start: ["shortcutStart", "Go to the start"],
  end: ["shortcutEnd", "Go to the end"],
  jump: ["shortcutJump", "Jump to a percentage"],
  shortcuts: ["shortcuts", "Keyboard shortcuts"],
};

const KEY_NAMES: Record<string, string> = {
  " ": "Space",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
};

const keyName = (key: string) => KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key);

/** Lists the keyboard shortcuts in a sheet, opened with `?` or from the settings menu. */
export const shortcuts = definePlugin("shortcuts", () => ({
  requires: ["hotkeys"],
  state: () => ({
    /** True while the list is showing. */
    open: false,
  }),
  commands: (context) => ({
    /** The shortcuts to list, as the hotkeys plugin reports them. */
    bindings: () => context.find<typeof hotkeys>("hotkeys")?.commands.bindings() ?? [],
    /** Shows the list. */
    show: () => context.set({ open: true }),
    /** Closes the list. */
    hide: () => context.set({ open: false }),
    /** Shows the list, or closes it if it's showing. */
    toggle: () => context.set({ open: !context.state().open }),
  }),
  setup(context, scope) {
    const keys = context.find<typeof hotkeys>("hotkeys");
    if (!keys) return;
    scope.add(
      keys.commands.bind("?", "shortcuts", () => context.set({ open: !context.state().open }))
    );
  },
  slots: { overlay: ShortcutsSheet, menu: ShortcutsMenu },
}));

/** The list of shortcuts. It reads them from the hotkeys plugin, so it can't go stale. */
export function ShortcutsSheet() {
  const player = usePlayer();
  const open = useVideoState(shortcuts, (state) => state.open);
  const { hide, bindings } = useCommands(shortcuts);
  const title = useLabel("shortcuts", "Keyboard shortcuts");
  const close = useLabel("close", "Close");
  const name = (id: string, seconds?: number) => {
    const [key, fallback] = NAMES[id] ?? [id, id];
    return labelFrom(player, key, fallback).replace("{seconds}", String(seconds));
  };
  return (
    <Panel
      open={open}
      onClose={hide}
      closeLabel={close}
      trigger="menu-trigger"
      aria-label={title}
      data-panel="shortcuts"
    >
      <div data-part="shortcuts-body" data-autofocus="" tabIndex={0}>
        <p data-part="shortcuts-title">{title}</p>
        <dl data-part="shortcuts-list">
          {bindings().map(({ id, keys, seconds }) => (
            <div key={id} data-part="shortcut">
              <dt data-part="shortcut-name">{name(id, seconds)}</dt>
              <dd data-part="shortcut-keys">
                {keys.map((key, index) => (
                  <Fragment key={key}>
                    {index > 0 && id === "jump" ? "–" : null}
                    <kbd data-part="shortcut-key">{keyName(key)}</kbd>
                  </Fragment>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}
ShortcutsSheet.displayName = "Video.ShortcutsSheet";

/** The row that opens the list. */
export function ShortcutsMenu() {
  const { show } = useCommands(shortcuts);
  const title = useLabel("shortcuts", "Keyboard shortcuts");
  return (
    <MenuItem data-menu="shortcuts" onSelect={show}>
      <span data-part="menu-item-label">{title}</span>
      <kbd data-part="menu-item-value">?</kbd>
    </MenuItem>
  );
}
ShortcutsMenu.displayName = "Video.ShortcutsMenu";
