"use client";

import { forwardRef, useEffect, useRef } from "react";
import { definePlugin } from "../../core/plugin";
import type { MediaTrackInfo } from "../../core/types";
import { usePlayer } from "../../react/context";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";
import { MenuRadioGroup } from "../../react/primitives/menu-radio-group";
import { MenuRadioItem } from "../../react/primitives/menu-radio-item";
import { MenuSub } from "../../react/primitives/menu-sub";
import { CaptionsIcon } from "../../ui/icons";

export interface CaptionTrack {
  src: string;
  language: string;
  label: string;
  kind?: "captions" | "subtitles";
}

export interface CaptionsOptions {
  /** Tracks to add to the video. Tracks from `<track>` or an engine appear too. */
  tracks?: readonly CaptionTrack[];
  /** A language to turn on as soon as a matching track appears. */
  language?: string | null;
}

const OFF = "off";

const isTimedText = ({ kind }: TextTrack) => kind === "captions" || kind === "subtitles";
const trackId = (track: TextTrack, index: number) =>
  track.id || track.language || track.label || String(index);

function listTracks(element: HTMLVideoElement | null): TextTrack[] {
  const list = element?.textTracks;
  if (!list) return [];
  const tracks: TextTrack[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const track = list[index];
    if (track && isTimedText(track)) tracks.push(track);
  }
  return tracks;
}

type CueListener = (cues: readonly TextTrackCue[]) => void;

/**
 * Draws captions itself, so they can be styled and move clear of the controls.
 * Native rendering takes over only in iOS fullscreen, where nothing else can draw.
 */
export const captions = definePlugin("captions", (options: CaptionsOptions = {}) => {
  const listeners = new Set<CueListener>();
  let wanted = options.language ?? null;
  let lastActive: string | null = null;
  let activeTrack: TextTrack | null = null;
  let nativeFullscreen = false;

  const emit = () => {
    const cues = activeTrack?.activeCues;
    const list: TextTrackCue[] = [];
    if (cues) {
      for (let index = 0; index < cues.length; index += 1) {
        const cue = cues[index];
        if (cue) list.push(cue);
      }
    }
    for (const listener of listeners) listener(list);
  };

  const setActiveTrack = (track: TextTrack | null) => {
    activeTrack?.removeEventListener("cuechange", emit);
    activeTrack = track;
    track?.addEventListener("cuechange", emit);
    emit();
  };

  return {
    state: () => ({ tracks: [] as readonly MediaTrackInfo[], active: null as string | null }),
    attrs: { "data-captions": (state) => state.active !== null },
    commands(context) {
      const select = (id: string | null) => {
        const video = context.video();
        const tracks = listTracks(video);
        let chosen: TextTrack | null = null;
        tracks.forEach((track, index) => {
          const match = trackId(track, index) === id;
          if (match) chosen = track;
          // Hidden still loads cues and fires cuechange, without the browser drawing.
          track.mode = match ? (nativeFullscreen ? "showing" : "hidden") : "disabled";
        });
        setActiveTrack(chosen);
        context.set({ active: chosen ? id : null });
        if (chosen) lastActive = id;
        // Remote providers, like Cast, hold their tracks themselves.
        context.commands.setTextTrack(chosen ? id : null);
      };
      return {
        select,
        toggle() {
          const { active, tracks } = context.state();
          if (active !== null) select(null);
          else select(lastActive ?? tracks[0]?.id ?? null);
        },
        /** Turns a language on now, or as soon as a matching track appears. */
        prefer(language: string | null) {
          wanted = language;
          if (language === null) select(null);
          else {
            const match = context.state().tracks.find((track) => track.language === language);
            if (match) select(match.id);
          }
        },
        onCues(listener: CueListener) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
      };
    },
    attach(context, element, scope) {
      for (const { src, language, label, kind = "subtitles" } of options.tracks ?? []) {
        const track = document.createElement("track");
        track.src = src;
        track.srclang = language;
        track.label = label;
        track.kind = kind;
        element.append(track);
        scope.add(() => track.remove());
      }

      const handle = () => context.player.plugin(captions).commands;
      const list = element.textTracks;
      if (!list) return;

      const publish = () => {
        const tracks = listTracks(element);
        context.set({
          tracks: tracks.map((track, index) => ({
            id: trackId(track, index),
            label: track.label,
            language: track.language,
            kind: track.kind,
          })),
        });
        // Browsers can turn a default track on, which would draw it twice.
        tracks.forEach((track, index) => {
          if (track.mode !== "showing" || nativeFullscreen) return;
          track.mode = "hidden";
          if (context.state().active === null) handle().select(trackId(track, index));
        });
        if (wanted !== null && context.state().active === null) handle().prefer(wanted);
      };
      scope.on(list, "addtrack", publish);
      scope.on(list, "removetrack", publish);
      publish();

      const setNative = (active: boolean) => {
        nativeFullscreen = active;
        if (activeTrack) activeTrack.mode = active ? "showing" : "hidden";
      };
      scope.on(element, "webkitbeginfullscreen", () => setNative(true));
      scope.on(element, "webkitendfullscreen", () => setNative(false));
      scope.add(() => {
        setActiveTrack(null);
        context.set({ active: null, tracks: [] });
      });
    },
    slots: { overlay: CaptionsDisplay, "controls-end": CaptionsToggle, menu: CaptionsMenu },
  };
});

/** Draws the active cues. It writes to the DOM directly, with no React renders. */
export function CaptionsDisplay() {
  const player = usePlayer();
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    return player.plugin(captions).commands.onCues((cues) => {
      node.replaceChildren(
        ...cues.map((cue) => {
          const line = document.createElement("span");
          line.setAttribute("data-part", "caption-line");
          // WebVTT's own parser builds this, allowing only its few inline elements.
          const vtt = cue as VTTCue;
          if (vtt.getCueAsHTML) line.append(vtt.getCueAsHTML());
          else line.textContent = vtt.text ?? "";
          return line;
        })
      );
    });
  }, [player]);

  return <div ref={element} data-part="captions" aria-hidden="true" />;
}
CaptionsDisplay.displayName = "Video.CaptionsDisplay";

export type CaptionsToggleProps = ButtonProps;

/** Renders nothing until there's a track to show. */
export const CaptionsToggle = forwardRef<HTMLButtonElement, CaptionsToggleProps>(
  function CaptionsToggle({ onClick, children, ...props }, ref) {
    const available = useVideoState(captions, (state) => state.tracks.length > 0);
    const active = useVideoState(captions, (state) => state.active !== null);
    const { toggle } = useCommands(captions);
    const label = useLabel("captions", "Captions");
    if (!available) return null;
    return (
      <Button
        ref={ref}
        data-part="captions-toggle"
        aria-label={label}
        aria-pressed={active}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) toggle();
        }}
        {...props}
      >
        {children ?? <CaptionsIcon />}
      </Button>
    );
  }
);
CaptionsToggle.displayName = "Video.CaptionsToggle";

/** Renders nothing until there's a track to show. */
export function CaptionsMenu() {
  const tracks = useVideoState(captions, (state) => state.tracks);
  const active = useVideoState(captions, (state) => state.active);
  const { select } = useCommands(captions);
  const title = useLabel("captions", "Captions");
  const off = useLabel("captionsOff", "Off");
  if (tracks.length === 0) return null;

  const name = (track: MediaTrackInfo) => track.label || track.language || track.id;
  const current = tracks.find((track) => track.id === active);

  return (
    <MenuSub title={title} value={current ? name(current) : off} data-menu="captions">
      <MenuRadioGroup
        value={active ?? OFF}
        onValueChange={(value) => select(value === OFF ? null : value)}
      >
        <MenuRadioItem value={OFF}>{off}</MenuRadioItem>
        {tracks.map((track) => (
          <MenuRadioItem key={track.id} value={track.id}>
            {name(track)}
          </MenuRadioItem>
        ))}
      </MenuRadioGroup>
    </MenuSub>
  );
}
CaptionsMenu.displayName = "Video.CaptionsMenu";
