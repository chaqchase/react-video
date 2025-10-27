import { useEffect, useState } from "react";

const useFullscreen = (
  element: HTMLElement | null,
  vidEl?: HTMLVideoElement | null,
  callback?: (isFullscreen: boolean) => void
) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      // @ts-ignore
      const isFS =
        document.fullscreenElement ||
        // @ts-ignore
        document.mozFullScreenElement ||
        // @ts-ignore
        document.webkitFullscreenElement ||
        // @ts-ignore
        document.msFullscreenElement;
      callback?.(!!isFS);
      setIsFullscreen(!!isFS);
    };

    const onFullscreenError = () => {
      callback?.(false);
      setIsFullscreen(false);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);
    document.addEventListener("fullscreenerror", onFullscreenError);
    document.addEventListener("webkitfullscreenerror", onFullscreenError);
    document.addEventListener("mozfullscreenerror", onFullscreenError);
    document.addEventListener("MSFullscreenError", onFullscreenError);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        onFullscreenChange
      );
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
      document.removeEventListener("fullscreenerror", onFullscreenError);
      document.removeEventListener("webkitfullscreenerror", onFullscreenError);
      document.removeEventListener("mozfullscreenerror", onFullscreenError);
      document.removeEventListener("MSFullscreenError", onFullscreenError);
    };
  }, [callback]);

  const requestFullscreen = (el: HTMLElement) => {
    if (el.requestFullscreen) {
      el.requestFullscreen();
      // @ts-ignore
    } else if (el.mozRequestFullScreen) {
      // @ts-ignore
      el.mozRequestFullScreen();
      // @ts-ignore
    } else if (el.webkitRequestFullScreen) {
      // @ts-ignore
      el.webkitRequestFullScreen();
      // @ts-ignore
    } else if (el.children[0] && "webkitEnterFullscreen" in el.children[0]) {
      // @ts-ignore
      (el.children[0] as HTMLElement).webkitEnterFullscreen();
      // @ts-ignore
    } else if (el.msRequestFullscreen) {
      // @ts-ignore
      el.msRequestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      // @ts-ignore
    } else if (document.mozCancelFullScreen) {
      // @ts-ignore
      document.mozCancelFullScreen();
      // @ts-ignore
    } else if (document.webkitExitFullscreen) {
      // @ts-ignore
      document.webkitExitFullscreen();
      // @ts-ignore
    } else if (
      element?.children[0] &&
      "webkitExitFullscreen" in element.children[0]
    ) {
      // @ts-ignore
      (element.children[0] as HTMLElement).webkitExitFullscreen();
      // @ts-ignore
    } else if (document.msExitFullscreen) {
      // @ts-ignore
      document.msExitFullscreen();
    }
  };

  const handleFullScreen = () => {
    try {
      if (!element) {
        return;
      }
      if (isFullscreen) {
        setIsFullscreen(false);
        exitFullscreen();
      } else {
        if (
          element.children[0] &&
          // @ts-ignore
          "webkitEnterFullscreen" in element.children[0]
        ) {
          setIsFullscreen(true);
        }
        requestFullscreen(element);
      }
    } catch {}
  };

  const handleExitFullScreen = () => {
    try {
      if (isFullscreen) {
        setIsFullscreen(false);
        exitFullscreen();
      }
    } catch {}
  };

  return {
    handleFullScreen,
    handleExitFullScreen,
    isFullscreen,
  };
};

export default useFullscreen;
