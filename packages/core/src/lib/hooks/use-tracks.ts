import { useEffect, useState } from "react";
import type { VideoTrack } from "../../types/video.types";

/**
 * Hook to manage text tracks (captions/subtitles) for a video element.
 * Sets the active text track mode to 'showing' for the selected index
 * and 'disabled' for all others. Supports null index to disable all tracks (Off).
 *
 * @param video - The video element reference
 * @param tracks - Array of video track metadata
 * @param defaultIndex - Initial track index to enable (null = Off)
 * @param onChange - Callback fired when the active track changes
 * @returns Object with activeTrackIndex and setActiveTrackIndex
 */
export function useTracks(
  video: HTMLVideoElement | null,
  tracks?: VideoTrack[],
  defaultIndex?: number | null,
  onChange?: (index: number | null, track?: VideoTrack | null) => void
) {
  // Find default track from tracks array if not explicitly set
  const initialIndex =
    defaultIndex !== undefined
      ? defaultIndex
      : tracks?.findIndex((t) => t.default) ?? null;

  const [activeTrackIndex, setActiveTrackIndex] = useState<number | null>(
    initialIndex === -1 ? null : initialIndex
  );

  useEffect(() => {
    // Guard for SSR
    if (typeof window === "undefined" || !video) {
      return;
    }

    // Wait for video to have textTracks loaded
    const applyTrackModes = () => {
      const textTracks = video.textTracks;
      if (!textTracks || textTracks.length === 0) {
        return;
      }

      // Disable all tracks first
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (track) {
          track.mode = "disabled";
        }
      }

      // Enable the selected track if activeTrackIndex is valid
      if (
        activeTrackIndex !== null &&
        activeTrackIndex >= 0 &&
        activeTrackIndex < textTracks.length
      ) {
        const selectedTrack = textTracks[activeTrackIndex];
        if (selectedTrack) {
          selectedTrack.mode = "showing";
        }
      }
    };

    // Apply modes immediately if tracks are available
    applyTrackModes();

    // Also listen for track changes in case tracks load asynchronously
    const handleLoadedMetadata = () => {
      // Small delay to ensure tracks are fully loaded
      setTimeout(applyTrackModes, 100);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("loadeddata", applyTrackModes);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("loadeddata", applyTrackModes);
    };
  }, [video, activeTrackIndex, tracks]);

  // Wrapper to call onChange callback
  const handleSetActiveTrackIndex = (index: number | null) => {
    setActiveTrackIndex(index);
    const track = index !== null && tracks ? tracks[index] : null;
    onChange?.(index, track);
  };

  return {
    activeTrackIndex,
    setActiveTrackIndex: handleSetActiveTrackIndex,
  };
}

export default useTracks;
