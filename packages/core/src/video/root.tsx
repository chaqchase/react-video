import { cn } from "@/lib/utils";
import { forwardRef, useImperativeHandle, useRef } from "react";
import useVideo from "../lib/hooks/use-video";
import type {
  VideoHandle,
  VideoSource,
  VideoTrack,
} from "../types/video.types";
import { VideoContext } from "./context";

/**
 * Props for the Video.Root component.
 */
export type VideoRootProps = {
  /** Video source URL or array of source objects */
  src: VideoSource;
  /** Text tracks for captions/subtitles */
  tracks?: VideoTrack[];
  /** Poster image URL */
  poster?: string;
  /** Video title */
  title?: string;
  /** Video subtitle */
  subtitle?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to autoplay the video */
  autoPlay?: boolean;
  /** Whether to loop the video */
  loop?: boolean;
  /** Whether to show controls overlay */
  showControls?: boolean;
  /** Hotkeys behavior: enable/disable and scope */
  hotkeys?:
    | boolean
    | { scope?: "focused" | "hovered" | "global"; enabled?: boolean };
  /** Child components (Video.Media, Video.Header, etc.) */
  children: React.ReactNode;

  /** Called when playback progresses */
  onProgress?: (currentTime: number) => void;
  /** Called when duration becomes available */
  onDuration?: (duration: number) => void;
  /** Called when video playback ends */
  onEnded?: () => void;
  /** Called when video starts playing */
  onPlay?: () => void;
  /** Called when video is paused */
  onPause?: () => void;
  /** Called when video metadata is loaded */
  onLoad?: () => void;
  /** Called when volume changes */
  onVolumeChange?: (volume: number) => void;
  /** Called when playback rate changes */
  onPlaybackRateChange?: (playbackRate: number) => void;
  /** Called when fullscreen state changes */
  onFullscreenChange?: (isFullscreen: boolean) => void;
  /** Called when picture-in-picture state changes */
  onPictureInPictureChange?: (isPip: boolean) => void;
  /** Called when active text track changes */
  onTrackChange?: (index: number | null, track?: VideoTrack | null) => void;
  /** Called when video quality/source changes */
  onQualityChange?: (
    index: number,
    source: { src: string; type: string; label?: string }
  ) => void;
  /** Default track index to enable on mount (null = Off) */
  defaultTrackIndex?: number | null;
  /** Default quality index to start with when src is an array */
  defaultQualityIndex?: number;
};

/**
 * Root component that provides context and manages video player state.
 * Wrap all other Video.* components inside this component.
 *
 * @example
 * ```tsx
 * <Video.Root src="video.mp4" ref={videoRef}>
 *   <Video.Media />
 *   <Video.Center>
 *     <Video.PlayPause />
 *   </Video.Center>
 * </Video.Root>
 * ```
 */
export const VideoRoot = forwardRef<VideoHandle, VideoRootProps>(
  (
    {
      src,
      tracks,
      poster,
      title,
      subtitle,
      className,
      autoPlay = true,
      loop,
      showControls = true,
      hotkeys,
      children,
      onProgress,
      onDuration,
      onEnded,
      onPlay,
      onPause,
      onLoad,
      onVolumeChange,
      onPlaybackRateChange,
      onFullscreenChange,
      onPictureInPictureChange,
      onTrackChange,
      onQualityChange,
      defaultTrackIndex,
      defaultQualityIndex,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const {
      isPlaying,
      isMuted,
      isFullscreen,
      isPip,
      duration,
      currentTime,
      volume,
      handlePlay,
      handlePause,
      handleMute,
      handleUnmute,
      handleVolumeChange,
      handleSeek,
      handleFullScreen,
      handleExitFullScreen,
      handlePip,
      handleExitPip,
      remainingTime,
      backBy,
      forwardBy,
      isLoading,
      showControls: show,
      buffered,
      isLoaded,
      playbackRate,
      handlePlaybackRateChange,
      activeTrackIndex,
      qualityIndex,
      setActiveTrackIndex,
      setQualityIndex,
    } = useVideo({
      src,
      tracks,
      onDuration,
      onEnded,
      onPause,
      onPlay,
      onPlaybackRateChange,
      onProgress,
      onVolumeChange,
      showControls,
      onLoad,
      videoRef,
      wrapperRef,
      onFullscreenChange,
      onPictureInPictureChange,
      onTrackChange,
      onQualityChange,
      defaultTrackIndex,
      defaultQualityIndex,
      hotkeys:
        typeof hotkeys === "boolean"
          ? { enabled: hotkeys, scope: "focused" }
          : hotkeys,
    });

    // Expose imperative handle for ref
    useImperativeHandle(ref, () => ({
      play: handlePlay,
      pause: handlePause,
      seek: handleSeek,
      setVolume: handleVolumeChange,
      mute: handleMute,
      unmute: handleUnmute,
      enterFullscreen: handleFullScreen,
      exitFullscreen: handleExitFullScreen,
      enterPip: handlePip,
      exitPip: handleExitPip,
    }));

    const contextValue = {
      videoRef,
      wrapperRef,
      src,
      tracks,
      poster,
      title,
      subtitle,
      autoPlay,
      loop,
      isPlaying,
      isMuted,
      isFullscreen,
      isPip,
      isLoading,
      isLoaded,
      duration,
      currentTime,
      buffered,
      volume,
      remainingTime,
      playbackRate,
      activeTrackIndex,
      qualityIndex,
      showControls: show,
      handlePlay,
      handlePause,
      handleMute,
      handleUnmute,
      handleVolumeChange,
      handlePlaybackRateChange,
      handleSeek,
      handleFullScreen,
      handleExitFullScreen,
      handlePip,
      handleExitPip,
      backBy,
      forwardBy,
      setActiveTrackIndex,
      setQualityIndex,
    };

    return (
      <VideoContext.Provider value={contextValue}>
        <div
          ref={wrapperRef}
          className={cn("rv-relative rv-aspect-video", className)}
        >
          {children}
        </div>
      </VideoContext.Provider>
    );
  }
);

VideoRoot.displayName = "Video.Root";
