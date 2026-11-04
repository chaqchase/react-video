"use client";

import { definePlugin } from "../../core/plugin";
import type { MediaTrackInfo } from "../../core/types";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { MenuRadioGroup } from "../../react/primitives/menu-radio-group";
import { MenuRadioItem } from "../../react/primitives/menu-radio-item";
import { MenuSub } from "../../react/primitives/menu-sub";

interface NativeAudioTrack {
  id: string;
  label: string;
  language: string;
  kind: string;
  enabled: boolean;
}
type NativeAudioTrackList = EventTarget & {
  length: number;
  [index: number]: NativeAudioTrack;
};
type WithAudioTracks = HTMLVideoElement & { audioTracks?: NativeAudioTrackList };

const toInfo = ({ id, label, language, kind }: NativeAudioTrack, index: number): MediaTrackInfo => ({
  id: id || String(index),
  label,
  language,
  kind,
});

/**
 * Picks between audio languages and descriptions. Engines report their own tracks,
 * and Safari's native tracks are read from the element here.
 */
export const audioTracks = definePlugin("audio-tracks", () => ({
  commands(context) {
    return {
      select(id: string) {
        const list = (context.video() as WithAudioTracks | null)?.audioTracks;
        if (list && context.media().provider === "native") {
          for (let index = 0; index < list.length; index += 1) {
            const track = list[index] as NativeAudioTrack;
            track.enabled = (track.id || String(index)) === id;
          }
          context.report({ audioTrack: id });
          return;
        }
        context.commands.setAudioTrack(id);
      },
    };
  },
  attach(context, element, scope) {
    const list = (element as WithAudioTracks).audioTracks;
    if (!list) return;
    const publish = () => {
      const { provider } = context.media();
      // An engine reports its own tracks instead. Null means nothing has loaded yet.
      if (provider !== null && provider !== "native") return;
      const tracks: NativeAudioTrack[] = [];
      for (let index = 0; index < list.length; index += 1) tracks.push(list[index] as NativeAudioTrack);
      const active = tracks.findIndex((track) => track.enabled);
      context.report({
        audioTracks: tracks.map(toInfo),
        audioTrack: active === -1 ? null : (tracks[active]?.id || String(active)),
      });
    };
    scope.on(list, "addtrack", publish);
    scope.on(list, "removetrack", publish);
    scope.on(list, "change", publish);
    publish();
  },
  slots: { menu: AudioMenu },
}));

/** Renders nothing unless there's a choice of audio. */
export function AudioMenu() {
  const tracks = useVideoState((media) => media.audioTracks);
  const active = useVideoState((media) => media.audioTrack);
  const { select } = useCommands(audioTracks);
  const title = useLabel("audio", "Audio");
  if (tracks.length < 2) return null;

  const name = (track: MediaTrackInfo) => track.label || track.language || track.id;
  const current = tracks.find((track) => track.id === active);

  return (
    <MenuSub title={title} value={current ? name(current) : undefined} data-menu="audio">
      <MenuRadioGroup value={active} onValueChange={select}>
        {tracks.map((track) => (
          <MenuRadioItem key={track.id} value={track.id}>
            {name(track)}
          </MenuRadioItem>
        ))}
      </MenuRadioGroup>
    </MenuSub>
  );
}
AudioMenu.displayName = "Video.AudioMenu";
