"use client";

import { definePlugin } from "../../core/plugin";
import { renditionProviderEntry } from "../../providers/native/renditions";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { MenuRadioGroup } from "../../react/primitives/menu-radio-group";
import { MenuRadioItem } from "../../react/primitives/menu-radio-item";
import { MenuSub } from "../../react/primitives/menu-sub";

/**
 * Quality levels from whichever provider is playing: an engine's adaptive levels,
 * or `{ renditions: [...] }` for progressive files.
 */
export const quality = definePlugin("quality", () => {
  let hasRenditions = false;
  return {
    commands: (context) => ({
      /** Switches to this level, or to automatic choice with `auto` if the provider offers it. */
      select: (id: string | "auto") => context.commands.setQuality(id),
    }),
    setup(context) {
      context.registerProvider(renditionProviderEntry(() => hasRenditions));
    },
    gates: {
      load(request, next) {
        hasRenditions = Boolean(request.renditions?.length);
        return next(request);
      },
    },
    slots: { menu: QualityMenu },
  };
});

/** Renders nothing unless there's more than one level to choose from. */
export function QualityMenu() {
  const few = useVideoState((media) => media.qualities.length < 2);
  const title = useLabel("quality", "Quality");
  if (few) return null;

  return (
    <MenuSub title={title} value={<ActiveQuality />} data-menu="quality">
      <QualityList />
    </MenuSub>
  );
}
QualityMenu.displayName = "Video.QualityMenu";

// Adaptive streams switch level during playback, so only an open menu reads it.
function ActiveQuality() {
  const levels = useVideoState((media) => media.qualities);
  const current = useVideoState((media) => media.quality);
  const auto = useLabel("auto", "Auto");
  const level = levels.find((candidate) => candidate.id === current.active);
  const name = level?.label ?? level?.id ?? "";
  return current.mode === "auto" ? `${auto} ${name}`.trim() : name;
}

function QualityList() {
  const levels = useVideoState((media) => media.qualities);
  const current = useVideoState((media) => media.quality);
  const { select } = useCommands(quality);
  const auto = useLabel("auto", "Auto");
  const sorted = [...levels].sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

  return (
    <MenuRadioGroup
      value={current.mode === "auto" ? "auto" : current.active}
      onValueChange={select}
    >
      {current.canAuto ? <MenuRadioItem value="auto">{auto}</MenuRadioItem> : null}
      {sorted.map((level) => (
        <MenuRadioItem key={level.id} value={level.id}>
          {level.label ?? level.id}
        </MenuRadioItem>
      ))}
    </MenuRadioGroup>
  );
}
