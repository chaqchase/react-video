// Generates the demo media with ffmpeg: 30 seconds of the View From A Blue Moon trailer
// as progressive renditions and HLS and DASH ladders, plus captions, chapters,
// thumbnails, an ad, a protected stream, alternate audio, and a broken source.
// The trailer belongs to its makers, and Plyr hosts it for demos. It isn't covered by
// this repo's licence, so none of this output is committed.
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

const SOURCE = "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4";
/** A scene cut, so the clip opens cleanly on the sea cliffs. */
const SOURCE_START = 21.62;
const DURATION = 30;
const FPS = 24;
const GOP = FPS * 2;
const SEGMENT = 4;
const LADDER = [
  { height: 270, width: 480, video: "300k", bandwidth: 420000, codec: "avc1.4d4015" },
  { height: 360, width: 640, video: "700k", bandwidth: 860000, codec: "avc1.4d401e" },
  { height: 720, width: 1280, video: "1800k", bandwidth: 2100000, codec: "avc1.4d401f" },
];

// Clear Key isn't secret by design. This proves decryption works, and nothing else.
const CLEAR_KEY = { kid: "000102030405060708090a0b0c0d0e0f", key: "101112131415161718191a1b1c1d1e1f" };

const ffmpeg = (...args) =>
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: "inherit",
  });
const file = (...parts) => join(out, ...parts);

rmSync(out, { recursive: true, force: true });
mkdirSync(file("hls"), { recursive: true });
mkdirSync(file("dash"), { recursive: true });
mkdirSync(file("drm"), { recursive: true });
mkdirSync(file("hls-tracks"), { recursive: true });

// A drifting chord for the alternate audio tracks, which only need to sound different.
const pad = (a, b) =>
  [[110, 0.22], [165, 0.16], [220, 0.13], [275, 0.09], [330, 0.07], [495, 0.03]]
    .map(([hz, level], partial) => {
      const swell = `(0.65+0.35*sin(2*PI*${partial + 1}*t/${DURATION}+${a * (partial + 1)}))`;
      return `${level}*${swell}*sin(2*PI*${hz * b}*t)`;
    })
    .join("+");
const ambient = (shift) =>
  `aevalsrc='${pad(0, shift)}|${pad(1.7, shift)}':s=48000:d=${DURATION},lowpass=f=1400`;

// ffmpeg reads only this range, so the trailer's other two and a half minutes never download.
ffmpeg(
  "-ss", String(SOURCE_START), "-t", String(DURATION), "-i", SOURCE,
  "-vf", `scale=1280:720,fps=${FPS}`,
  "-af", `afade=t=in:d=0.2,afade=t=out:st=${DURATION - 1}:d=1`,
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-c:a", "aac", "-b:a", "192k",
  file("master.mp4")
);

for (const { height, width, video } of LADDER) {
  ffmpeg(
    "-i", file("master.mp4"), "-vf", `scale=${width}:${height}`,
    "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main", "-pix_fmt", "yuv420p",
    "-b:v", video, "-g", String(GOP), "-keyint_min", String(GOP), "-sc_threshold", "0",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
    file(`sample-${height}.mp4`)
  );
}

ffmpeg(
  "-i", file("master.mp4"), "-vf", "scale=640:360",
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

// The same stream with subtitles the manifest delivers, for dash.js to list and fetch.
const textSet = (language, label) => `<AdaptationSet contentType="text" mimeType="text/vtt" lang="${language}">
			<Label>${label}</Label>
			<Representation id="captions-${language}" bandwidth="256">
				<BaseURL>../captions.${language}.vtt</BaseURL>
			</Representation>
		</AdaptationSet>`;
writeFileSync(
  file("dash", "subtitled.mpd"),
  readFileSync(file("dash", "manifest.mpd"), "utf8").replace(
    "</Period>",
    `${textSet("en", "English")}
		${textSet("ar", "العربية")}
	</Period>`
  )
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

// Taken from the source at full size, because a page can show the poster across a whole retina screen.
ffmpeg("-ss", String(SOURCE_START), "-i", SOURCE, "-frames:v", "1", "-q:v", "3", file("poster.jpg"));
writeFileSync(file("broken.mp4"), "this is not a video\n");

// Separate scenes to stand in for episodes, each with a still of its own.
mkdirSync(file("episodes"), { recursive: true });
for (const [index, start] of [14, 70, 53, 113, 148, 98].entries()) {
  ffmpeg(
    "-ss", String(start), "-t", "14", "-i", SOURCE,
    "-vf", "scale=960:540,format=yuv420p", "-r", String(FPS),
    "-af", "afade=t=in:d=0.3,afade=t=out:st=13.5:d=0.5",
    "-c:v", "libx264", "-preset", "veryfast", "-b:v", "1000k", "-c:a", "aac", "-b:a", "64k",
    "-movflags", "+faststart",
    file("episodes", `${index + 1}.mp4`)
  );
  ffmpeg(
    "-ss", String(start + 2), "-i", SOURCE,
    "-vf", "scale=480:270", "-frames:v", "1", "-q:v", "4",
    file("episodes", `${index + 1}.jpg`)
  );
}

// The same footage cropped upright, for vertical video. These scenes keep their subject in the middle.
ffmpeg(
  "-ss", "56.27", "-t", "16.2", "-i", SOURCE,
  "-vf", "crop=ih*9/16:ih,scale=720:1280,setsar=1,format=yuv420p", "-r", String(FPS),
  "-af", "afade=t=in:d=0.3,afade=t=out:st=15.7:d=0.5",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-c:a", "aac", "-b:a", "96k",
  "-movflags", "+faststart",
  file("sample-vertical.mp4")
);
ffmpeg(
  "-ss", "60", "-i", SOURCE,
  "-vf", "crop=ih*9/16:ih,scale=720:1280", "-frames:v", "1", "-q:v", "3",
  file("sample-vertical.jpg")
);

// A short creative for the ad examples, from a later scene so it's plainly not the content.
ffmpeg(
  "-ss", "118", "-t", "8", "-i", SOURCE,
  "-vf", "scale=640:360,format=yuv420p", "-r", String(FPS),
  "-af", "afade=t=in:d=0.3,afade=t=out:st=7.5:d=0.5",
  "-c:v", "libx264", "-preset", "veryfast", "-b:v", "700k", "-c:a", "aac", "-b:a", "64k",
  "-movflags", "+faststart",
  file("ad.mp4")
);

// Clear Key over DASH. The manifest has to announce the protection and the key ID,
// because ffmpeg's muxer writes neither.
ffmpeg(
  "-i", file("sample-360.mp4"), "-map", "0:v", "-map", "0:a", "-c", "copy",
  "-f", "dash", "-seg_duration", String(SEGMENT), "-use_template", "1", "-use_timeline", "1",
  "-adaptation_sets", "id=0,streams=v id=1,streams=a",
  "-format_options", `encryption_scheme=cenc-aes-ctr:encryption_key=${CLEAR_KEY.key}:encryption_kid=${CLEAR_KEY.kid}`,
  file("drm", "manifest.mpd")
);
const defaultKid = CLEAR_KEY.kid.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
writeFileSync(
  file("drm", "manifest.mpd"),
  readFileSync(file("drm", "manifest.mpd"), "utf8")
    .replace("<MPD ", '<MPD xmlns:cenc="urn:mpeg:cenc:2013" ')
    .replace(
      /(<AdaptationSet[^>]*>)/g,
      `$1
      <ContentProtection schemeIdUri="urn:mpeg:dash:mp4protection:2011" value="cenc" cenc:default_KID="${defaultKid}"/>
      <ContentProtection schemeIdUri="urn:uuid:e2719d58-a985-b3c9-781a-b030af78d30e" value="ClearKey1.0"/>`
    )
);

// HLS with alternate audio and engine-delivered subtitles.
ffmpeg(
  "-i", file("sample-360.mp4"), "-an", "-c", "copy",
  "-f", "hls", "-hls_time", String(SEGMENT), "-hls_playlist_type", "vod",
  "-hls_segment_filename", file("hls-tracks", "video-%03d.ts"),
  file("hls-tracks", "video.m3u8")
);
for (const [name, shift] of [["en", 1], ["es", 1.5]]) {
  ffmpeg(
    "-f", "lavfi", "-i", ambient(shift), "-c:a", "aac", "-b:a", "96k",
    "-f", "hls", "-hls_time", String(SEGMENT), "-hls_playlist_type", "vod",
    "-hls_segment_filename", file("hls-tracks", `audio-${name}-%03d.ts`),
    file("hls-tracks", `audio-${name}.m3u8`)
  );
}
writeFileSync(file("hls-tracks", "subtitles-en.vtt"), cues(5, (start) => `Engine subtitle at ${start} seconds`));
writeFileSync(
  file("hls-tracks", "subtitles-en.m3u8"),
  [
    "#EXTM3U", "#EXT-X-VERSION:3", `#EXT-X-TARGETDURATION:${DURATION}`, "#EXT-X-MEDIA-SEQUENCE:0",
    "#EXT-X-PLAYLIST-TYPE:VOD", `#EXTINF:${DURATION}.000,`, "subtitles-en.vtt", "#EXT-X-ENDLIST", "",
  ].join("\n")
);
writeFileSync(
  file("hls-tracks", "master.m3u8"),
  [
    "#EXTM3U", "#EXT-X-VERSION:4",
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="audio-en.m3u8"',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Español",LANGUAGE="es",DEFAULT=NO,AUTOSELECT=YES,URI="audio-es.m3u8"',
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",LANGUAGE="en",DEFAULT=NO,AUTOSELECT=YES,URI="subtitles-en.m3u8"',
    '#EXT-X-STREAM-INF:BANDWIDTH=860000,RESOLUTION=640x360,CODECS="avc1.4d401e,mp4a.40.2",AUDIO="audio",SUBTITLES="subs"',
    "video.m3u8", "",
  ].join("\n")
);

rmSync(file("master.mp4"));

writeFileSync(stamp, hash);
console.log(`media written to ${out}`);
