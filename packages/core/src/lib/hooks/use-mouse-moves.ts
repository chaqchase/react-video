import { useEffect, useState } from "react";

const useMouseMoves = (
  element: HTMLElement | null,
  show?: boolean,
  isPlaying?: boolean
) => {
  const [isMoving, setIsMoving] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  useEffect(() => {
    if (!element) {
      return;
    }

    if (!show) {
      return;
    }

    const showNowAndArmTimeout = () => {
      setIsMoving(true);
      setShowControls(true);
      if (timeoutId) clearTimeout(timeoutId);
      const id = window.setTimeout(() => {
        setIsMoving(false);
        // Keep visible if focus is within
        setShowControls(isFocusWithin);
      }, 3000);
      setTimeoutId(id);
    };

    const onMouseMove = () => showNowAndArmTimeout();
    const onPointerDown = () => showNowAndArmTimeout();
    const onTouchStart = () => showNowAndArmTimeout();
    const onFocusIn = () => {
      setIsFocusWithin(true);
      setShowControls(true);
      if (timeoutId) clearTimeout(timeoutId);
    };
    const onFocusOut = () => {
      setIsFocusWithin(false);
      if (!isMoving) setShowControls(false);
    };

    element.addEventListener("mousemove", onMouseMove);
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("focusin", onFocusIn);
    element.addEventListener("focusout", onFocusOut);

    return () => {
      element.removeEventListener("mousemove", onMouseMove);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("focusin", onFocusIn);
      element.removeEventListener("focusout", onFocusOut);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [element, timeoutId, isPlaying, isFocusWithin]);

  useEffect(() => {
    if (!show) {
      setShowControls(false);
      return;
    }
    if (!isPlaying) {
      setShowControls(true);
    } else {
      if (show) {
        setShowControls(true);
      } else {
        setShowControls(false);
      }
    }
  }, [isPlaying, show]);

  return {
    showControls,
    isMoving,
    isPlaying,
    isFocusWithin,
  };
};

export default useMouseMoves;
