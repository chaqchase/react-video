"use client";

import { Video } from "react-video-kit";

// Video sources for multiple qualities (H.264)
// Using View From A Blue Moon from Plyr CDN
const SOURCES = [
  {
    src: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4",
    type: "video/mp4",
    label: "1080p",
  },
  {
    src: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4",
    type: "video/mp4",
    label: "720p",
  },
  {
    src: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4",
    type: "video/mp4",
    label: "576p",
  },
] as const;

// Caption tracks (WebVTT format) from Plyr CDN
const TRACKS: Array<{
  src: string;
  kind: TextTrackKind;
  srclang: string;
  label: string;
  default?: boolean;
}> = [
  {
    src: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.en.vtt",
    kind: "subtitles",
    srclang: "en",
    label: "English",
    default: true,
  },
  {
    src: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.fr.vtt",
    kind: "subtitles",
    srclang: "fr",
    label: "French",
  },
];

const FEATURES = [
  {
    title: "Adaptive quality",
    description:
      "Switch between HD and SD streams instantly with the built-in quality menu.",
  },
  {
    title: "Accessible captions",
    description:
      "Radix-powered captions menu with keyboard support and multiple languages.",
  },
  {
    title: "Immersive controls",
    description:
      "Picture-in-picture, fullscreen, timeline, and contextual overlays out of the box.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-black via-zinc-950 to-black text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center gap-12 px-6 py-16">
        <section className="flex flex-col items-center gap-4 text-center">
          <a
            href="https://github.com/chaqchase/react-video"
            className="rounded-full bg-zinc-900 px-3 py-1 underline text-base font-medium text-zinc-100"
          >
            React Video Kit
          </a>
          <h1 className="text-2xl font-semibold text-white">
            A composable video player with thoughtful defaults
          </h1>
          <p className="max-w-2xl text-sm text-zinc-300 md:text-base">
            This minimal demo showcases every piece of the `Video` API—media,
            overlays, controls, quality switching, captions, and time
            displays—styled with a crisp dark palette.
          </p>
        </section>

        <section className="w-full max-w-4xl">
          <div className="relative overflow-hidden rounded-[28px] border border-zinc-800/60 bg-zinc-950/70 p-3 shadow-[0_40px_120px_-60px_rgba(0,0,0,1)] backdrop-blur">
            <Video.Root
              src={SOURCES.map((source) => ({
                src: source.src,
                type: source.type,
                label: source.label,
              }))}
              tracks={TRACKS}
              poster="https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.jpg"
              title="View From A Blue Moon"
              subtitle="Brainfarm · Multi-quality demo"
              autoPlay={false}
              showControls
              defaultQualityIndex={0}
              defaultTrackIndex={0}
              hotkeys={{ scope: "hovered", enabled: true }}
              className="rounded-3xl bg-zinc-900/40"
            >
              <Video.Media />
              <Video.Backdrop />

              <Video.Header className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Video.PipToggle />
                  <Video.FullscreenToggle />
                </div>
                <div className="flex items-center gap-1">
                  <Video.Volume.Button />
                  <Video.Volume.Slider />
                </div>
              </Video.Header>

              <Video.Center className="gap-6">
                <Video.SeekBack seconds={10} />
                <Video.PlayPause />
                <Video.SeekForward seconds={10} />
                <Video.Loading />
              </Video.Center>

              <Video.Footer className="gap-4">
                <div className="flex w-full flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-col">
                    <Video.Subtitle />
                    <Video.Title />
                  </div>
                  <div className="flex items-center gap-2">
                    <Video.CaptionsMenu />
                    <Video.QualityMenu />
                  </div>
                </div>
                <Video.Timeline />
                <div className="flex w-full items-center justify-between text-xs text-white/80">
                  <Video.Time.Current className="font-mono uppercase tracking-wide text-white/70" />
                  <Video.Time.Remaining
                    negative
                    className="font-mono uppercase tracking-wide text-white/70"
                  />
                </div>
              </Video.Footer>
            </Video.Root>
          </div>
        </section>

        <section className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-zinc-800/50 bg-zinc-800/20 p-6 shadow-[0_30px_120px_-80px_rgba(255,255,255,0.25)]"
            >
              <h2 className="text-lg font-semibold text-white">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {feature.description}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
