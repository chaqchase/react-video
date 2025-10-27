import { VideoCaptionsMenu } from "./controls/captions-menu";
import { VideoFullscreenToggle } from "./controls/fullscreen-toggle";
import { VideoLoading } from "./controls/loading";
import { VideoPipToggle } from "./controls/pip-toggle";
import { VideoPlayPause } from "./controls/play-pause";
import { VideoQualityMenu } from "./controls/quality-menu";
import { VideoSeekBack, VideoSeekForward } from "./controls/seek";
import {
  VideoTimeCurrent,
  VideoTime,
  VideoTimeRemaining,
} from "./controls/time";
import { VideoTimeline } from "./controls/timeline";
import {
  VideoVolume,
  VideoVolumeButton,
  VideoVolumeSlider,
} from "./controls/volume";
import { VideoBackdrop } from "./layout/backdrop";
import { VideoCenter } from "./layout/center";
import { VideoFooter } from "./layout/footer";
import { VideoHeader } from "./layout/header";
import { VideoMedia } from "./media";
import { VideoRoot } from "./root";
import { VideoSubtitle } from "./typography/subtitle";
import { VideoTitle } from "./typography/title";

// Namespace-style export for shadcn-like API
export const Video = {
  Root: VideoRoot,
  Media: VideoMedia,
  Backdrop: VideoBackdrop,
  Header: VideoHeader,
  Center: VideoCenter,
  Footer: VideoFooter,
  Title: VideoTitle,
  Subtitle: VideoSubtitle,
  PlayPause: VideoPlayPause,
  SeekBack: VideoSeekBack,
  SeekForward: VideoSeekForward,
  FullscreenToggle: VideoFullscreenToggle,
  PipToggle: VideoPipToggle,
  Timeline: VideoTimeline,
  Loading: VideoLoading,
  CaptionsMenu: VideoCaptionsMenu,
  QualityMenu: VideoQualityMenu,
  Volume: {
    Button: VideoVolumeButton,
    Slider: VideoVolumeSlider,
  },
  Time: {
    Current: VideoTimeCurrent,
    Remaining: VideoTimeRemaining,
  },
};

// Also export individual components for flexibility
export {
  VideoRoot,
  VideoMedia,
  VideoBackdrop,
  VideoHeader,
  VideoCenter,
  VideoFooter,
  VideoTitle,
  VideoSubtitle,
  VideoPlayPause,
  VideoSeekBack,
  VideoSeekForward,
  VideoFullscreenToggle,
  VideoPipToggle,
  VideoTimeline,
  VideoLoading,
  VideoCaptionsMenu,
  VideoQualityMenu,
  VideoVolume,
  VideoVolumeButton,
  VideoVolumeSlider,
  VideoTime,
  VideoTimeCurrent,
  VideoTimeRemaining,
};

// Re-export context hook for advanced usage
export { useVideoContext } from "./context";
