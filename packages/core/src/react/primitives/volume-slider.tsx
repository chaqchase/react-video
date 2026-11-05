"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { usePlayer } from "../context";
import { useCommands, useLabel, useVideoState } from "../hooks";
import { HIDDEN_INPUT } from "./as-child";
import { useSliderGesture } from "./slider-gesture";

export interface VolumeSliderProps extends HTMLAttributes<HTMLDivElement> {
  /** Change per arrow key press, from 0 to 1. */
  step?: number;
}

/** Renders nothing where the platform owns volume, such as iOS. */
export const VolumeSlider = forwardRef<HTMLDivElement, VolumeSliderProps>(
  function VolumeSlider({ step = 0.05, ...props }, ref) {
    const player = usePlayer();
    const commands = useCommands();
    const value = useVideoState((media) => (media.muted ? 0 : media.volume));
    const available = useVideoState(
      (media) =>
        media.capabilities.volume &&
        !media.locks.some(({ commands: locked }) => locked.includes("volume"))
    );
    const label = useLabel("volume", "Volume");

    const apply = (next: number) => {
      const volume = Math.min(Math.max(next, 0), 1);
      commands.setVolume(volume);
      commands.setMuted(volume === 0);
    };

    const gesture = useSliderGesture(() => ({
      current: () => {
        const { muted, volume } = player.getState().media;
        return muted ? 0 : volume;
      },
      disabled: () => false,
      focus: () => {},
      start: apply,
      move: apply,
      end: apply,
      cancel: () => {},
    }));

    if (!available) return null;

    return (
      <div
        ref={ref}
        data-part="volume-slider"
        dir="ltr"
        onPointerDown={gesture.onPointerDown}
        onPointerMove={gesture.onPointerMove}
        onPointerUp={gesture.onPointerUp}
        onPointerCancel={gesture.onPointerCancel}
        {...props}
      >
        <input
          type="range"
          style={HIDDEN_INPUT}
          data-part="volume-input"
          aria-label={label}
          aria-valuetext={`${Math.round(value * 100)}%`}
          min={0}
          max={1}
          step={step}
          value={value}
          onChange={(event) => apply(Number(event.target.value))}
        />
        <div data-part="volume-track">
          <div data-part="volume-fill" style={{ transform: `scaleX(${value})` }} />
        </div>
        <div data-part="volume-rail" style={{ transform: `translateX(${value * 100}%)` }}>
          <div data-part="volume-thumb" />
        </div>
      </div>
    );
  }
);
VolumeSlider.displayName = "Video.VolumeSlider";
