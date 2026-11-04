// A live stream from nothing but static files: a playlist whose window slides along
// a looping set of segments as the clock moves. Needs no server beyond this route.
const SEGMENT_SECONDS = 4;
/** Whole-length segments of the 360p rendition. The last one is shorter, so it's left out. */
const LOOP = 7;
const WINDOWS: Record<string, number> = {
  "stream.m3u8": 5,
  "dvr.m3u8": 25,
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, props: { params: Promise<{ playlist: string }> }) {
  const { playlist } = await props.params;
  const count = WINDOWS[playlist];
  if (count === undefined) return new Response("Not found", { status: 404 });

  const newest = Math.floor(Date.now() / 1000 / SEGMENT_SECONDS);
  const first = newest - count + 1;
  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    `#EXT-X-TARGETDURATION:${SEGMENT_SECONDS}`,
    `#EXT-X-MEDIA-SEQUENCE:${first}`,
    `#EXT-X-DISCONTINUITY-SEQUENCE:${Math.floor(first / LOOP)}`,
  ];
  for (let sequence = first; sequence <= newest; sequence += 1) {
    const index = sequence % LOOP;
    // Timestamps restart at each loop, which players must be told about.
    if (index === 0 && sequence !== first) lines.push("#EXT-X-DISCONTINUITY");
    lines.push(`#EXTINF:${SEGMENT_SECONDS}.0,`, `/media/hls/360-${String(index).padStart(3, "0")}.ts`);
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": "no-store",
    },
  });
}
