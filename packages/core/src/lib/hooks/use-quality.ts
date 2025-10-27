import { useEffect, useRef, useState } from "react";
import type { VideoSource } from "../../types/video.types";

/**
 * Hook to manage quality switching for multi-source videos.
 * When quality changes, preserves currentTime and play state with minimal stutter.
 * Includes race condition protection and error handling.
 *
 * @param video - The video element reference
 * @param src - Video source (string or array of sources)
 * @param defaultIndex - Initial quality index (only for array sources)
 * @param onChange - Callback fired when quality changes
 * @returns Object with qualityIndex and setQualityIndex
 */
export function useQuality(
  video: HTMLVideoElement | null,
  src: VideoSource,
  defaultIndex: number = 0,
  onChange?: (
    index: number,
    source: { src: string; type: string; label?: string }
  ) => void
) {
  // If src is a string, quality index is always 0 and switching is a no-op
  const sources = Array.isArray(src) ? src : null;
  const initialIndex = sources
    ? Math.max(0, Math.min(defaultIndex, sources.length - 1))
    : 0;

  const [qualityIndex, setQualityIndex] = useState<number>(initialIndex);
  const switchingRef = useRef(false);
  const savedTimeRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);
  const requestIdRef = useRef<number>(0); // For race condition protection
  const previousIndexRef = useRef<number>(initialIndex); // Track successful switches

  useEffect(() => {
    // Guard for SSR
    if (typeof window === "undefined" || !video || !sources) {
      return;
    }

    // No need to switch if quality index matches current
    if (!switchingRef.current) {
      return;
    }

    const newSource = sources[qualityIndex];
    if (!newSource) {
      switchingRef.current = false;
      return;
    }

    // Increment request ID for race condition protection
    const currentRequestId = ++requestIdRef.current;

    // Save current state
    savedTimeRef.current = video.currentTime;
    wasPlayingRef.current = !video.paused;
    const savedPlaybackRate = video.playbackRate;

    // Pause video during switch
    if (!video.paused) {
      video.pause();
    }

    // Set new source
    video.src = newSource.src;
    video.load();

    // Handler to restore state after new source loads
    const handleLoadedMetadata = () => {
      // Ignore if this is from an old request
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Restore time
      if (savedTimeRef.current > 0) {
        video.currentTime = savedTimeRef.current;
      }

      // Restore playback rate
      if (savedPlaybackRate && savedPlaybackRate !== video.playbackRate) {
        video.playbackRate = savedPlaybackRate;
      }
    };

    const handleCanPlay = () => {
      // Ignore if this is from an old request
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Resume playback if it was playing before
      if (wasPlayingRef.current) {
        video.play().catch((err) => {
          console.warn("Failed to resume playback after quality switch:", err);
        });
      }
      switchingRef.current = false;
      previousIndexRef.current = qualityIndex;
    };

    const handleError = () => {
      // Ignore if this is from an old request
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      console.error("Failed to load quality source:", newSource.src);
      switchingRef.current = false;

      // Attempt to revert to previous working source
      const previousSource = sources[previousIndexRef.current];
      if (previousSource && previousIndexRef.current !== qualityIndex) {
        console.log("Reverting to previous quality:", previousSource.label);
        setQualityIndex(previousIndexRef.current);

        // Notify about the failure
        onChange?.(previousIndexRef.current, previousSource);
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [video, qualityIndex, sources, onChange]);

  // Wrapper to trigger quality switch
  const handleSetQualityIndex = (index: number) => {
    if (!sources || index === qualityIndex) {
      return;
    }

    if (index < 0 || index >= sources.length) {
      console.warn(`Invalid quality index: ${index}`);
      return;
    }

    const newSource = sources[index];
    if (!newSource) {
      return;
    }

    setQualityIndex(index);
    switchingRef.current = true;

    // Call onChange callback
    onChange?.(index, newSource);
  };

  return {
    qualityIndex,
    setQualityIndex: handleSetQualityIndex,
  };
}

export default useQuality;
