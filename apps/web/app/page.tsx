"use client";
import { useRef } from "react";
import { Video, type VideoHandle } from "react-video-kit";

export default function Home() {
  const ref = useRef<VideoHandle>(null);

  return (
    <main className="min-h-screen w-full bg-black text-white">
      <section className="mx-auto max-w-5xl px-4 py-12">
        <header className="mb-10 space-y-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">react-video-kit</p>
          <h1 className="text-3xl font-semibold leading-tight">Composable React Video Player</h1>
          <p className="text-zinc-400">
            Build video experiences with composable primitives, declarative sources and captions, and an imperative ref API.
          </p>
        </header>

        {/* Featured player */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-0">
          <Video.Root
            src="https://vjs.zencdn.net/v/oceans.mp4"
            title="Ocean Video"
            subtitle="Beautiful ocean scene"
          >
            <Video.Media />
            <Video.Backdrop />

            <Video.Header>
              <div className="rv-w-full rv-flex">
                <Video.FullscreenToggle />
                <Video.PipToggle />
              </div>
              <div className="rv-w-full rv-flex rv-justify-end rv-items-center rv-h-fit">
                <Video.Volume.Button />
                <Video.Volume.Slider />
              </div>
            </Video.Header>

            <Video.Center>
              <Video.SeekBack seconds={10} />
              <Video.PlayPause />
              <Video.SeekForward seconds={10} />
              <Video.Loading />
            </Video.Center>

            <Video.Footer>
              <div className="rv-flex rv-flex-col">
                <Video.Subtitle />
                <Video.Title />
              </div>
              <Video.Timeline />
              <div className="rv-flex rv-justify-between rv-w-full">
                <Video.Time.Current />
                <Video.Time.Remaining negative />
              </div>
            </Video.Footer>
          </Video.Root>
        </div>

        {/* Imperative controls */}
        <div className="mt-10 space-y-3">
          <h2 className="text-xl font-medium">Imperative Control</h2>
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-0">
            <Video.Root ref={ref} src="https://vjs.zencdn.net/v/oceans.mp4" autoPlay={false}>
              <Video.Media />
              <Video.Center>
                <Video.PlayPause />
                <Video.Loading />
              </Video.Center>
              <Video.Footer>
                <Video.Timeline />
                <div className="rv-flex rv-justify-between rv-w-full">
                  <Video.Time.Current />
                  <Video.Time.Remaining negative />
                </div>
              </Video.Footer>
            </Video.Root>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => ref.current?.play()} className="rounded bg-white px-4 py-2 text-black hover:bg-white/90">
              Play
            </button>
            <button onClick={() => ref.current?.pause()} className="rounded bg-white px-4 py-2 text-black hover:bg-white/90">
              Pause
            </button>
            <button onClick={() => ref.current?.seek(30)} className="rounded bg-white px-4 py-2 text-black hover:bg-white/90">
              Seek 30s
            </button>
            <button onClick={() => ref.current?.setVolume(0.5)} className="rounded bg-white px-4 py-2 text-black hover:bg-white/90">
              Volume 50%
            </button>
            <button onClick={() => ref.current?.enterFullscreen()} className="rounded bg-white px-4 py-2 text-black hover:bg-white/90">
              Fullscreen
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
