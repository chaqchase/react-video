// Generates original, license-free media with ffmpeg: a looping dusk landscape as
// progressive renditions and HLS and DASH ladders, plus captions, chapters,
// thumbnails, an ad, a protected stream, alternate audio, and a broken source.
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

// Each moving term completes whole cycles, so the picture loops with no seam.
const wave = (cycles, across, phase = 0) =>
  `sin(2*PI*(${across}*ld(1)+${cycles}*T/${DURATION})+${phase})`;
const RIDGES = [
  { base: 0.56, color: [86, 62, 112], shape: `0.040*${wave(1, 1.5, 0.4)}+0.016*${wave(4, 6, 1.1)}+0.006*${wave(8, 13, 2)}` },
  { base: 0.67, color: [52, 40, 88], shape: `0.055*${wave(1, 1, 2.1)}+0.020*${wave(3, 3.5, 0.2)}+0.008*${wave(7, 9, 1.7)}` },
  { base: 0.81, color: [24, 20, 54], shape: `0.070*${wave(1, 0.5, 4)}+0.024*${wave(4, 2, 1)}+0.009*${wave(9, 5, 3)}` },
];
const blend = (from, to, amount) => `(${from}+(${to}-${from})*${amount})`;
const landscape = (index, [top, middle, low], sun) => {
  const upper = blend(top, middle, "min(ld(0)/0.34,1)");
  const sky = blend(upper, low, "max(min((ld(0)-0.30)/0.32,1),0)");
  const glow = `${sun}*(0.85*exp(-ld(2)/0.035)+0.5*exp(-ld(2)/0.003))`;
  // Each ridge blends over what's behind it across one pixel, which keeps its edge
  // smooth when the picture is scaled up.
  const layers = RIDGES.map(({ base, shape, color }, layer) => {
    // Nearer ridges catch less of the sun's haze than far ones.
    const haze = `${sun}*${0.16 - layer * 0.06}*exp(-pow((ld(1)-0.36)*2.2,2))`;
    const cover = `clip((ld(0)-(${base}+${shape}))*H,0,1)`;
    return `st(3,ld(3)+(${color[index]}+${haze}-ld(3))*${cover});`;
  }).join("");
  const sunX = `(0.36+0.012*sin(2*PI*T/${DURATION}))`;
  const sunY = `(0.47+0.010*cos(2*PI*T/${DURATION}))`;
  return `st(0,Y/H);st(1,X/W);st(2,pow((ld(1)-${sunX})*1.78,2)+pow(ld(0)-${sunY},2));st(3,min(${sky}+${glow},255));${layers}ld(3)`;
};
const scene = [
  `r='${landscape(0, [20, 88, 250], 255)}'`,
  `g='${landscape(1, [26, 58, 150], 196)}'`,
  `b='${landscape(2, [66, 118, 104], 128)}'`,
].join(":");

// A chord that drifts, with every frequency a multiple of 1/30 Hz so it loops too.
const pad = (a, b) =>
  [[110, 0.22], [165, 0.16], [220, 0.13], [275, 0.09], [330, 0.07], [495, 0.03]]
    .map(([hz, level], partial) => {
      const swell = `(0.65+0.35*sin(2*PI*${partial + 1}*t/${DURATION}+${a * (partial + 1)}))`;
      return `${level}*${swell}*sin(2*PI*${hz * b}*t)`;
    })
    .join("+");
const ambient = (shift) =>
  `aevalsrc='${pad(0, shift)}|${pad(1.7, shift)}':s=48000:d=${DURATION},lowpass=f=1400`;

// Rendered at half rate, then blended up. Motion this slow looks the same, for half the wait.
ffmpeg(
  "-f", "lavfi", "-i",
  `color=c=black:s=480x270:r=${FPS / 2}:d=${DURATION},format=gbrp,geq=${scene},framerate=fps=${FPS},scale=1280:720:flags=bicubic,gblur=sigma=1.4,noise=alls=3:allf=t,format=yuv420p`,
  "-f", "lavfi", "-i", ambient(1),
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

ffmpeg("-ss", "1", "-i", file("sample-720.mp4"), "-frames:v", "1", "-q:v", "3", file("poster.jpg"));
writeFileSync(file("broken.mp4"), "this is not a video\n");

// A short creative for the ad examples, plainly different from the content.
ffmpeg(
  "-f", "lavfi", "-i", "gradients=s=640x360:r=24:d=8:n=3:c0=0x0d9488:c1=0x22d3ee:c2=0xfde68a:speed=0.03:type=radial,format=yuv420p",
  "-f", "lavfi", "-i", "aevalsrc='0.2*sin(2*PI*440*t)*(0.5+0.5*sin(2*PI*t))':s=48000:d=8",
  "-c:v", "libx264", "-preset", "veryfast", "-b:v", "300k", "-c:a", "aac", "-b:a", "64k",
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
