import type { LoadRequest, RenditionSet, SourceInput } from "./types";

function isRenditionSet(input: SourceInput): input is RenditionSet {
  return typeof input === "object" && "renditions" in input;
}

/** Expands any accepted `src` shape into the requests to try, in order. */
export function toLoadRequests(input: SourceInput | null | undefined): LoadRequest[] {
  if (input === null || input === undefined || input === "") return [];
  if (typeof input === "string") return [{ source: { src: input } }];
  if (Array.isArray(input)) {
    return input.map((source) => ({ source }));
  }
  if (isRenditionSet(input)) {
    const initial = input.initial ?? 0;
    const start = input.renditions[initial] ?? input.renditions[0];
    if (!start) return [];
    return [
      {
        source: { src: start.src, type: start.type },
        renditions: input.renditions,
        initialRendition: input.renditions.indexOf(start),
      },
    ];
  }
  return [{ source: input }];
}

/** A stable identity for `src`, so re-rendering with equal values doesn't reload. */
export function sourceKey(input: SourceInput | null | undefined): string {
  return JSON.stringify(input ?? null);
}
