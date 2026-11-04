"use client";

import { useState, type PointerEvent } from "react";

/** How far a touch travels sideways before it counts as a drag, not a scroll or tap. */
const TOUCH_SLOP_PX = 10;

export interface SliderGestureHandlers {
  /** The slider's value as a fraction, so touch can drag relative to the grab point. */
  current(): number;
  disabled(): boolean;
  start(fraction: number): void;
  move(fraction: number): void;
  end(fraction: number): void;
  cancel(): void;
  /** Called for the keyboard's benefit: focus lands on the input after a press. */
  focus(): void;
}

interface Gesture {
  id: number;
  left: number;
  width: number;
  originX: number;
  originY: number;
  /** Fraction at `originX`. */
  base: number;
  relative: boolean;
  dragging: boolean;
  last: number;
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

function createSliderGesture(handlers: () => SliderGestureHandlers) {
  let gesture: Gesture | null = null;

  const locate = (active: Gesture, x: number) =>
    active.relative
      ? clamp(active.base + (x - active.originX) / active.width)
      : clamp((x - active.left) / active.width);

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      const slider = handlers();
      if (event.button !== 0 || slider.disabled()) return;
      const element = event.currentTarget;
      // The only layout read of the gesture: pointer moves reuse this rectangle.
      const { left, width } = element.getBoundingClientRect();
      if (width === 0) return;
      const touch = event.pointerType === "touch";
      gesture = {
        id: event.pointerId,
        left,
        width,
        originX: event.clientX,
        originY: event.clientY,
        base: slider.current(),
        relative: false,
        dragging: false,
        last: 0,
      };
      if (touch) return;
      event.preventDefault();
      slider.focus();
      element.setPointerCapture?.(event.pointerId);
      gesture.dragging = true;
      gesture.last = locate(gesture, event.clientX);
      slider.start(gesture.last);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (!gesture || gesture.id !== event.pointerId) return;
      const slider = handlers();
      if (!gesture.dragging) {
        if (Math.abs(event.clientX - gesture.originX) < TOUCH_SLOP_PX) return;
        // Drags track from where the finger landed, so the thumb doesn't jump to it.
        gesture.relative = true;
        gesture.originX = event.clientX;
        gesture.dragging = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        gesture.last = gesture.base;
        slider.start(gesture.last);
        return;
      }
      gesture.last = locate(gesture, event.clientX);
      slider.move(gesture.last);
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (!gesture || gesture.id !== event.pointerId) return;
      const active = gesture;
      gesture = null;
      const slider = handlers();
      if (active.dragging) {
        slider.end(active.last);
      } else {
        // A tap seeks to where it landed.
        const fraction = locate(active, event.clientX);
        slider.start(fraction);
        slider.end(fraction);
      }
    },
    onPointerCancel(event: PointerEvent<HTMLElement>) {
      if (!gesture || gesture.id !== event.pointerId) return;
      const { dragging } = gesture;
      gesture = null;
      // The browser took the touch for scrolling.
      if (dragging) handlers().cancel();
    },
  };
}

/** Pointer handling shared by sliders: mouse drags directly, touch waits to be sure. */
export function useSliderGesture(handlers: () => SliderGestureHandlers) {
  const [gesture] = useState(() => createSliderGesture(handlers));
  return gesture;
}
