"use client";

import {
  forwardRef,
  useContext,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import { VideoKitError } from "../../core/kit-error";
import { definePlugin } from "../../core/plugin";
import type { Player } from "../../core/types";
import { formatTime } from "../../lib/format-time";
import { parseVtt } from "../../lib/vtt";
import { PlayerContext } from "../../react/context";
import { useClock, useCommands, useLabel, useVideoState } from "../../react/hooks";
import type { captions } from "../captions/index";

export interface TranscriptOptions {
  /** The language to show while captions are off. Defaults to the first track. */
  language?: string;
}

export interface TranscriptCue {
  /** Where the line starts, in seconds. */
  start: number;
  /** The line, as plain text. */
  text: string;
}

/** How closely the transcript follows playback, in seconds. */
const RESOLUTION = 0.25;
const resolution = () => RESOLUTION;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&lrm;": "",
  "&rlm;": "",
};

/** Cue text can hold voice and style tags, which a plain list has no use for. */
const plainText = (text: string) =>
  text
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|nbsp|lrm|rlm);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s*\n\s*/g, " ")
    .trim();

/**
 * The words of the video as a list to read and to jump around in. It follows the
 * captions track that's on, or else `language` or the first track.
 */
export const transcript = definePlugin("transcript", (options: TranscriptOptions = {}) => ({
  requires: ["captions"],
  state: () => ({
    /** The lines of the track being shown, in order. */
    cues: [] as readonly TranscriptCue[],
    /** The language of those lines, or null before there are any. */
    language: null as string | null,
  }),
  setup(context, scope) {
    const handle = context.find<typeof captions>("captions");
    if (!handle) return;
    let shown: string | null = null;
    let stop = () => {};

    const choose = () => {
      const { tracks, active, language } = handle.state();
      return (
        tracks.find(({ id }) => id === active) ??
        tracks.find((track) => track.language === (options.language ?? language)) ??
        tracks[0] ??
        null
      );
    };

    const load = (language: string | undefined) => {
      stop();
      const video = context.video();
      if (!video) return;
      const finish = (cues: readonly TranscriptCue[]) => {
        context.set({ cues, language: language ?? null });
      };
      const element = [...video.querySelectorAll("track")].find(
        (track) => track.srclang === language
      );
      if (element?.src) {
        const controller = new AbortController();
        stop = () => controller.abort();
        fetch(element.src, { signal: controller.signal })
          .then((response) => (response.ok ? response.text() : ""))
          .then((text) =>
            finish(parseVtt(text).map(({ start, text: line }) => ({ start, text: plainText(line) })))
          )
          .catch(() => {});
        return;
      }
      // An engine's track has no file, and it only has cues while captions are on.
      const track = [...video.textTracks].find((item) => item.language === language);
      if (!track) {
        finish([]);
        return;
      }
      const read = () => {
        const cues = [...(track.cues ?? [])] as VTTCue[];
        finish(cues.map(({ startTime, text }) => ({ start: startTime, text: plainText(text) })));
      };
      track.addEventListener("cuechange", read);
      stop = () => track.removeEventListener("cuechange", read);
      read();
    };

    const update = () => {
      const track = choose();
      const key = track ? `${track.id}:${track.language}` : null;
      if (key === shown) return;
      shown = key;
      load(track?.language);
    };

    scope.add(context.player.subscribe(update));
    scope.add(() => stop());
    update();
  },
}));

export interface TranscriptProps extends HTMLAttributes<HTMLDivElement> {
  /** The player to follow. Needed only when this part is outside `Root`. */
  player?: Player;
}

function scrollToRow(list: HTMLElement, row: Element | null | undefined) {
  if (!row) return;
  const offset = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  list.scrollTo({
    top: list.scrollTop + offset - list.clientHeight / 2 + row.clientHeight / 2,
    behavior: still ? "auto" : "smooth",
  });
}

const List = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function List(props, ref) {
  const cues = useVideoState(transcript, (state) => state.cues);
  const language = useVideoState(transcript, (state) => state.language);
  const duration = useVideoState((media) => media.duration);
  const { seek } = useCommands();
  const resume = useLabel("transcriptResume", "Back to the current line");
  const name = useLabel("transcript", "Transcript");
  const list = useRef<HTMLOListElement>(null);
  const following = useRef(true);
  const [away, setAway] = useState(false);

  const write = useMemo(() => {
    let current = -1;
    return (time: number) => {
      const node = list.current;
      if (!node) return;
      let next = -1;
      for (let index = cues.length - 1; index >= 0; index -= 1) {
        if (time >= (cues[index]?.start ?? Infinity)) {
          next = index;
          break;
        }
      }
      if (next === current) return;
      const rows = node.children;
      rows[current]?.firstElementChild?.removeAttribute("aria-current");
      rows[next]?.firstElementChild?.setAttribute("aria-current", "true");
      current = next;
      if (following.current) scrollToRow(node, rows[next]);
    };
  }, [cues]);
  useClock(write, resolution);

  const leave = () => {
    following.current = false;
    setAway(true);
  };
  const follow = () => {
    following.current = true;
    setAway(false);
  };

  return (
    <div ref={ref} data-part="transcript" {...props}>
      <ol
        ref={list}
        data-part="transcript-list"
        aria-label={name}
        lang={language ?? undefined}
        onWheel={leave}
        onTouchMove={leave}
        onPointerDown={(event) => {
          // A press on the list itself, not a row, is on its scrollbar.
          if (event.target === event.currentTarget) leave();
        }}
        onKeyDown={(event) => {
          if (/^(Arrow(Up|Down)|Page(Up|Down)|Home|End)$/.test(event.key)) leave();
        }}
      >
        {cues.map((cue) => (
          <li key={`${cue.start}:${cue.text}`}>
            {/* `auto` reads the line, so a row in Arabic mirrors on any page. */}
            <button
              type="button"
              data-part="transcript-cue"
              dir="auto"
              onClick={() => {
                follow();
                seek(cue.start);
              }}
            >
              <time data-part="transcript-time" dir="ltr">
                {formatTime(cue.start, duration)}
              </time>
              <span data-part="transcript-text">{cue.text}</span>
            </button>
          </li>
        ))}
      </ol>
      {away ? (
        <button
          type="button"
          data-part="transcript-resume"
          onClick={() => {
            follow();
            const node = list.current;
            if (!node) return;
            const row = node.querySelector<HTMLElement>('[aria-current="true"]');
            scrollToRow(node, row?.parentElement);
            // This button is about to go, so focus moves to the line it returned to.
            (row ?? node.querySelector("button"))?.focus({ preventScroll: true });
          }}
        >
          {resume}
        </button>
      ) : null}
    </div>
  );
});

/**
 * The transcript itself. Put it inside `Root`, or anywhere else on the page with the
 * `player` prop. It highlights the current line through the clock, with no renders.
 */
export const Transcript = forwardRef<HTMLDivElement, TranscriptProps>(function Transcript(
  { player, ...props },
  ref
) {
  const inherited = useContext(PlayerContext);
  const value = player ?? inherited;
  if (!value) {
    throw new VideoKitError(
      "part-outside-root",
      "react-video-kit: <Transcript> needs a `player` prop outside <Video.Root>."
    );
  }
  return (
    <PlayerContext.Provider value={value}>
      <List ref={ref} {...props} />
    </PlayerContext.Provider>
  );
});
Transcript.displayName = "Video.Transcript";
