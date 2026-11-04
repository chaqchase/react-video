// Generates license-free test media with ffmpeg: progressive renditions, HLS
// and DASH ladders, captions, chapters, thumbnails, and a broken source.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const out = resolve(dirname(scriptPath), "..", "public", "media");
const stamp = join(out, ".stamp");
const hash = createHash("sha256").update(readFileSync(scriptPath)).digest("hex");

if (existsSync(stamp) && readFileSync(stamp, "utf8") === hash) {
  console.log("media is up to date");
  process.exit(0);
}

const DURATION = 30;
const FPS = 24;
const GOP = FPS * 2;
const SEGMENT = 4;
const LADDER = [
  { height: 270, width: 480, video: "300k", bandwidth: 420000, codec: "avc1.4d4015" },
  { height: 360, width: 640, video: "700k", bandwidth: 860000, codec: "avc1.4d401e" },
  { height: 720, width: 1280, video: "1800k", bandwidth: 2100000, codec: "avc1.4d401f" },
];

const ffmpeg = (...args) =>
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: "inherit",
  });
const file = (...parts) => join(out, ...parts);

rmSync(out, { recursive: true, force: true });
mkdirSync(file("hls"), { recursive: true });
mkdirSync(file("dash"), { recursive: true });

const sources = (width, height) => [
  "-f", "lavfi", "-i", `testsrc2=size=${width}x${height}:rate=${FPS}:duration=${DURATION}`,
  "-f", "lavfi", "-i", `sine=frequency=330:sample_rate=48000:duration=${DURATION}`,
];

for (const { height, width, video } of LADDER) {
  ffmpeg(
    ...sources(width, height),
    "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main", "-pix_fmt", "yuv420p",
    "-b:v", video, "-g", String(GOP), "-keyint_min", String(GOP), "-sc_threshold", "0",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
    file(`sample-${height}.mp4`)
  );
}

ffmpeg(
  ...sources(640, 360),
  "-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8", "-b:v", "500k",
  "-g", String(GOP), "-c:a", "libopus", "-b:a", "64k",
  file("sample-360.webm")
);

const master = ["#EXTM3U", "#EXT-X-VERSION:3"];
for (const { height, width, bandwidth, codec } of LADDER) {
  ffmpeg(
    "-i", file(`sample-${height}.mp4`), "-c", "copy",
    "-f", "hls", "-hls_time", String(SEGMENT), "-hls_playlist_type", "vod",
    "-hls_segment_filename", file("hls", `${height}-%03d.ts`),
    file("hls", `${height}.m3u8`)
  );
  master.push(
    `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${height},CODECS="${codec},mp4a.40.2"`,
    `${height}.m3u8`
  );
}
writeFileSync(file("hls", "master.m3u8"), `${master.join("\n")}\n`);

ffmpeg(
  ...LADDER.flatMap(({ height }) => ["-i", file(`sample-${height}.mp4`)]),
  ...LADDER.flatMap((_, index) => ["-map", `${index}:v`]),
  "-map", "0:a", "-c", "copy",
  "-f", "dash", "-seg_duration", String(SEGMENT), "-use_template", "1", "-use_timeline", "1",
  "-adaptation_sets", "id=0,streams=v id=1,streams=a",
  file("dash", "manifest.mpd")
);

const timestamp = (seconds) =>
  `00:${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}.000`;
const cues = (step, text) => {
  const lines = ["WEBVTT", ""];
  for (let start = 0; start < DURATION; start += step) {
    lines.push(`${timestamp(start)} --> ${timestamp(Math.min(start + step, DURATION))}`, text(start), "");
  }
  return lines.join("\n");
};

writeFileSync(file("captions.en.vtt"), cues(5, (start) => `English caption at ${start} seconds`));
writeFileSync(file("captions.ar.vtt"), cues(5, (start) => `ترجمة عربية عند الثانية ${start}`));
writeFileSync(
  file("chapters.vtt"),
  cues(10, (start) => ["Opening", "Middle", "Closing"][start / 10])
);

const THUMB_STEP = 5;
const THUMB = { width: 160, height: 90 };
const columns = DURATION / THUMB_STEP;
ffmpeg(
  "-i", file("sample-360.mp4"),
  "-vf", `fps=1/${THUMB_STEP},scale=${THUMB.width}:${THUMB.height},tile=${columns}x1`,
  "-frames:v", "1", "-q:v", "5",
  file("thumbnails.jpg")
);
writeFileSync(
  file("thumbnails.vtt"),
  cues(THUMB_STEP, (start) => {
    const x = (start / THUMB_STEP) * THUMB.width;
    return `thumbnails.jpg#xywh=${x},0,${THUMB.width},${THUMB.height}`;
  })
);

ffmpeg("-i", file("sample-720.mp4"), "-frames:v", "1", "-q:v", "4", file("poster.jpg"));
writeFileSync(file("broken.mp4"), "this is not a video\n");

writeFileSync(stamp, hash);
console.log(`media written to ${out}`);
