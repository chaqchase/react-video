import { useEffect, useMemo, useState } from "react";
import { UseVideoProps, UseVideoReturn } from "../../types/use-video.types";
import { isVideo } from "../utils";
import useBuffered from "./use-buffered";
import useDuration from "./use-duration";
import useFullscreen from "./use-fullscreen";
import useMouseMoves from "./use-mouse-moves";
import useOnKeyDown from "./use-on-key-down";
import usePip from "./use-pip";
import usePlayPause from "./use-play";
import usePlaybackRate from "./use-playrate";
import useQuality from "./use-quality";
import useTracks from "./use-tracks";
import useVolume from "./use-volume";

export const useVideo = ({
  src,
  tracks,
  onProgress,
  onDuration,
  onEnded,
  onPlay,
  onPause,
  onVolumeChange,
  onPlaybackRateChange,
  onPictureInPictureChange,
  onFullscreenChange,
  onTrackChange,
  onQualityChange,
  defaultTrackIndex,
  defaultQualityIndex,
  showControls: show,
  onLoad,
  wrapperRef,
  videoRef,
  hotkeys,
}: UseVideoProps): UseVideoReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const { buffered, setBuffered } = useBuffered(videoRef.current);
  const { handlePlaybackRateChange, playbackRate, setPlaybackRate } =
    usePlaybackRate(videoRef.current, onPlaybackRateChange);
  const { handleMute, handleUnmute, handleVolumeChange, isMuted, volume } =
    useVolume(videoRef.current, onVolumeChange);
  const { handlePlay, handlePause, isPlaying, setIsPlaying } = usePlayPause(
    videoRef.current,
    (isPlaying) => {
      if (isPlaying) {
        onPlay?.();
      } else {
        onPause?.();
      }
    }
  );
  const { handleExitFullScreen, handleFullScreen, isFullscreen } =
    useFullscreen(wrapperRef.current, videoRef.current, onFullscreenChange);
  const { handlePip, handleExitPip, isPip } = usePip(
    videoRef.current,
    onPictureInPictureChange
  );
  const {
    duration,
    handleSeek,
    backBy,
    forwardBy,
    currentTime,
    setCurrentTime,
  } = useDuration(videoRef.current, onDuration);
  const { showControls } = useMouseMoves(wrapperRef.current, show, isPlaying);

  // New hooks for tracks and quality management
  const { activeTrackIndex, setActiveTrackIndex } = useTracks(
    videoRef.current,
    tracks,
    defaultTrackIndex,
    onTrackChange
  );
  const { qualityIndex, setQualityIndex } = useQuality(
    videoRef.current,
    src,
    defaultQualityIndex,
    onQualityChange
  );

  const remainingTime = useMemo(
    () => duration - currentTime,
    [duration, currentTime]
  );

  const hotkeyScope = hotkeys?.scope ?? "focused";
  const hotkeysEnabled = hotkeys?.enabled !== false;

  useOnKeyDown(
    " ",
    () => {
      if (isPlaying) {
        handlePause();
      } else {
        handlePlay();
      }
    },
    {
      wrapperRef:
        wrapperRef as unknown as React.MutableRefObject<HTMLElement | null>,
      scope: hotkeyScope,
      enabled: hotkeysEnabled,
    }
  );
  useOnKeyDown("ArrowLeft", () => backBy(5), {
    wrapperRef:
      wrapperRef as unknown as React.MutableRefObject<HTMLElement | null>,
    scope: hotkeyScope,
    enabled: hotkeysEnabled,
  });
  useOnKeyDown("ArrowRight", () => forwardBy(5), {
    wrapperRef:
      wrapperRef as unknown as React.MutableRefObject<HTMLElement | null>,
    scope: hotkeyScope,
    enabled: hotkeysEnabled,
  });
  useOnKeyDown("ArrowUp", () => handleVolumeChange(volume + 0.1), {
    wrapperRef:
      wrapperRef as unknown as React.MutableRefObject<HTMLElement | null>,
    scope: hotkeyScope,
    enabled: hotkeysEnabled,
  });
  useOnKeyDown("ArrowDown", () => handleVolumeChange(volume - 0.1), {
    wrapperRef:
      wrapperRef as unknown as React.MutableRefObject<HTMLElement | null>,
    scope: hotkeyScope,
    enabled: hotkeysEnabled,
  });
  useOnKeyDown(
    "f",
    () => {
      if (isFullscreen) {
        handleExitFullScreen();
      } else {
        handleFullScreen();
      }
    },
    {
      wrapperRef:
        wrapperRef as unknown as React.MutableRefObject<HTMLElement | null>,
      scope: hotkeyScope,
      enabled: hotkeysEnabled,
    }
  );
  useOnKeyDown(
    "p",
    () => {
      if (isPip) {
        handleExitPip();
      } else {
        handlePip();
      }
    },
    {
      wrapperRef:
        wrapperRef as unknown as React.MutableRefObject<HTMLElement | null>,
      scope: hotkeyScope,
      enabled: hotkeysEnabled,
    }
  );
  useOnKeyDown(
    "m",
    () => {
      if (isMuted) {
        handleUnmute();
      } else {
        handleMute();
      }
    },
    {
      wrapperRef:
        wrapperRef as unknown as React.MutableRefObject<HTMLElement | null>,
      scope: hotkeyScope,
      enabled: hotkeysEnabled,
    }
  );
  useOnKeyDown(
    "Escape",
    () => {
      if (isFullscreen) {
        handleExitFullScreen();
      }
      if (isPip) {
        handleExitPip();
      }
    },
    {
      wrapperRef:
        wrapperRef as unknown as React.MutableRefObject<HTMLElement | null>,
      scope: hotkeyScope,
      enabled: hotkeysEnabled,
    }
  );

  // Ensure crossOrigin is set on the video element to prevent CORS issues
  useEffect(() => {
    const video = videoRef.current as HTMLVideoElement;
    if (!isVideo(video)) {
      return;
    }
    // Explicitly set crossOrigin to ensure CORS works for all video sources
    if (video.crossOrigin !== "anonymous") {
      video.crossOrigin = "anonymous";
      // Reload the video if it has already started loading without CORS
      if (video.networkState !== video.NETWORK_EMPTY) {
        video.load();
      }
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current as HTMLVideoElement;
    if (!isVideo(video)) {
      return;
    }
    const handlers = {
      loadeddata: () => {
        setIsLoading(false);
        setIsLoaded(true);
        onLoad?.();
      },
      canplay: () => {
        setIsLoading(false);
      },
      progress: () => {
        setBuffered(video.buffered);
      },
      timeupdate: () => {
        setCurrentTime(video.currentTime);
        onProgress?.(video.currentTime);
        setIsLoading(false);
        setIsPlaying(!video.paused);
      },
      ended: () => {
        setIsPlaying(false);
        onEnded?.();
      },
      ratechange: () => {
        setPlaybackRate(video.playbackRate);
        onPlaybackRateChange?.(video.playbackRate);
      },
      loadstart: () => {
        setIsLoading(true);
      },
      waiting: () => {
        setIsLoading(true);
      },
      seeking: () => {
        setIsLoading(true);
      },
    };

    video.addEventListener("loadstart", handlers.loadstart);
    video.addEventListener("loadeddata", handlers.loadeddata);
    video.addEventListener("canplay", handlers.canplay);
    video.addEventListener("seeking", handlers.seeking);
    video.addEventListener("waiting", handlers.waiting);
    video.addEventListener("progress", handlers.progress);
    video.addEventListener("timeupdate", handlers.timeupdate);
    video.addEventListener("ended", handlers.ended);
    video.addEventListener("ratechange", handlers.ratechange);

    return () => {
      video.removeEventListener("loadstart", handlers.loadstart);
      video.removeEventListener("loadeddata", handlers.loadeddata);
      video.removeEventListener("canplay", handlers.canplay);
      video.removeEventListener("waiting", handlers.waiting);
      video.removeEventListener("progress", handlers.progress);
      video.removeEventListener("timeupdate", handlers.timeupdate);
      video.removeEventListener("ended", handlers.ended);
      video.removeEventListener("ratechange", handlers.ratechange);
      video.removeEventListener("seeking", handlers.seeking);
    };
  }, [
    src,
    onLoad,
    onProgress,
    onEnded,
    onPlaybackRateChange,
    setBuffered,
    setCurrentTime,
    setIsLoading,
    setIsPlaying,
    setPlaybackRate,
  ]);

  return {
    isPlaying,
    isMuted,
    isFullscreen,
    isPip,
    duration,
    currentTime,
    buffered,
    volume,
    remainingTime,
    playbackRate,
    activeTrackIndex,
    qualityIndex,
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
    isLoading,
    isLoaded,
    showControls,
  };
};

export default useVideo;
