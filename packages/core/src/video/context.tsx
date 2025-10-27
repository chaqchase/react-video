import { createContext, useContext } from "react";
import type { VideoSource, VideoTrack } from "../types/video.types";

export type VideoContextValue = {
  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;

  // Props
  src: VideoSource;
  tracks?: VideoTrack[];
  poster?: string;
  title?: string;
  subtitle?: string;
  autoPlay?: boolean;
  loop?: boolean;

  // State
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isPip: boolean;
  isLoading: boolean;
  isLoaded: boolean;
  duration: number;
  currentTime: number;
  buffered: TimeRanges | null;
  volume: number;
  remainingTime: number;
  playbackRate: number;
  activeTrackIndex: number | null;
  qualityIndex: number;
  showControls: boolean;

  // Actions
  handlePlay: () => void;
  handlePause: () => void;
  handleMute: () => void;
  handleUnmute: () => void;
  handleVolumeChange: (value: number) => void;
  handlePlaybackRateChange: (value: number) => void;
  handleSeek: (value: number) => void;
  handleFullScreen: () => void;
  handleExitFullScreen: () => void;
  handlePip: () => void;
  handleExitPip: () => void;
  backBy: (seconds: number) => void;
  forwardBy: (seconds: number) => void;
  setActiveTrackIndex: (index: number | null) => void;
  setQualityIndex: (index: number) => void;
};

export const VideoContext = createContext<VideoContextValue | null>(null);

export function useVideoContext() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error(
      "Video components must be used within a Video.Root component"
    );
  }
  return context;
}
