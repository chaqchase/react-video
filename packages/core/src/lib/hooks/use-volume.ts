import { useEffect, useState } from "react";

const useVolume = (
  video: HTMLVideoElement | null,
  callback?: (volume: number) => void
) => {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);

  useEffect(() => {
    if (video?.volume) {
      setVolume(video.volume);
      callback?.(video.volume);
    }
  }, [video?.volume]);

  const handleVolumeChange = (value: number) => {
    if (!video) {
      return;
    }
    setIsMuted(false);
    video.muted = false;
    if (value > 1) {
      video.volume = 1;
      setVolume(1);
      setPreviousVolume(1);
      return;
    }
    if (value <= 0) {
      video.volume = 0;
      setVolume(0);
      setIsMuted(true);
      video.muted = true;
      return;
    }
    video.volume = value;
    setVolume(value);
    setPreviousVolume(value);
    setIsMuted(value === 0);
  };

  const handleMute = () => {
    if (!video) {
      return;
    }
    // Store current volume before muting
    if (volume > 0) {
      setPreviousVolume(volume);
    }
    video.muted = true;
    setIsMuted(true);
    // Don't change the volume state - keep the slider position
  };

  const handleUnmute = () => {
    if (!video) {
      return;
    }
    video.muted = false;
    setIsMuted(false);
    // Restore previous volume if current volume is 0
    if (volume === 0 || video.volume === 0) {
      const restoreVolume = previousVolume > 0 ? previousVolume : 0.5;
      video.volume = restoreVolume;
      setVolume(restoreVolume);
    }
  };

  return {
    handleMute,
    handleUnmute,
    handleVolumeChange,
    volume,
    isMuted,
  };
};

export default useVolume;
