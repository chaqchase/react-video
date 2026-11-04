export interface VttCue {
  start: number;
  end: number;
  text: string;
}

function parseTimestamp(value: string): number {
  const parts = value.trim().split(":").map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Reads a WebVTT file's cues. Enough for chapters and thumbnails, not for captions. */
export function parseVtt(text: string): VttCue[] {
  const cues: VttCue[] = [];
  // The browser's parser only serves <track>, so these files are read by hand.
  for (const block of text.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const lines = block.split("\n");
    const timing = lines.findIndex((line) => line.includes("-->"));
    if (timing === -1) continue;
    const [start, end] = (lines[timing] as string).split("-->");
    if (start === undefined || end === undefined) continue;
    cues.push({
      start: parseTimestamp(start),
      // Cue settings can follow the end time.
      end: parseTimestamp(end.trim().split(/\s+/)[0] ?? ""),
      text: lines
        .slice(timing + 1)
        .join("\n")
        .trim(),
    });
  }
  return cues;
}
