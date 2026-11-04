"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { BufferingIndicator as PrimitiveBuffering, type BufferingIndicatorProps } from "../../react/primitives/buffering";
import { PlayOverlay as PrimitivePlayOverlay, type PlayOverlayProps } from "../../react/primitives/layout";
import { Menu, MenuContent, MenuTrigger, type MenuContentProps } from "../../react/primitives/menu";
import { PlayPause as PrimitivePlayPause, type PlayPauseProps } from "../../react/primitives/play-pause";
import { CurrentTime, Duration } from "../../react/primitives/time";
import { Mute as PrimitiveMute, VolumeSlider, type MuteProps } from "../../react/primitives/volume";
import { usePlayer } from "../../react/context";
import { useLabel } from "../../react/hooks";
import { Slot } from "../../react/slot";
import { PauseIcon, PlayIcon, ReplayIcon, SettingsIcon, SpinnerIcon, VolumeIcon } from "../icons";

/** Icons stack in one grid cell, so the skin can cross-fade between states. */
export const PlayPause = forwardRef<HTMLButtonElement, PlayPauseProps>(function PlayPause(
  { children, ...props },
  ref
) {
  return (
    <PrimitivePlayPause ref={ref} {...props}>
      {children ?? (
        <>
          <PlayIcon data-show="paused" />
          <PauseIcon data-show="playing" />
          <ReplayIcon data-show="ended" />
        </>
      )}
    </PrimitivePlayPause>
  );
});
PlayPause.displayName = "Video.PlayPause";

export const PlayOverlay = forwardRef<HTMLButtonElement, PlayOverlayProps>(function PlayOverlay(
  { children, ...props },
  ref
) {
  return (
    <PrimitivePlayOverlay ref={ref} {...props}>
      {children ?? (
        <>
          <PlayIcon data-show="ready" />
          <ReplayIcon data-show="ended" />
        </>
      )}
    </PrimitivePlayOverlay>
  );
});
PlayOverlay.displayName = "Video.PlayOverlay";

export const Mute = forwardRef<HTMLButtonElement, MuteProps>(function Mute(
  { children, ...props },
  ref
) {
  return (
    <PrimitiveMute ref={ref} {...props}>
      {children ?? <VolumeIcon />}
    </PrimitiveMute>
  );
});
Mute.displayName = "Video.Mute";

export type VolumeProps = HTMLAttributes<HTMLDivElement>;

/** Mute button and slider, with the slider opening as the pointer arrives. */
export const Volume = forwardRef<HTMLDivElement, VolumeProps>(function Volume(props, ref) {
  return (
    <div ref={ref} data-part="volume" {...props}>
      <Mute />
      <VolumeSlider />
    </div>
  );
});
Volume.displayName = "Video.Volume";

export type TimeProps = HTMLAttributes<HTMLDivElement>;

/** Current time and duration together. */
export const Time = forwardRef<HTMLDivElement, TimeProps>(function Time(props, ref) {
  return (
    <div ref={ref} data-part="time" {...props}>
      <CurrentTime />
      <span data-part="time-separator" aria-hidden="true">
        /
      </span>
      <Duration />
    </div>
  );
});
Time.displayName = "Video.Time";

export const BufferingIndicator = forwardRef<HTMLDivElement, BufferingIndicatorProps>(
  function BufferingIndicator({ children, ...props }, ref) {
    return (
      <PrimitiveBuffering ref={ref} {...props}>
        {children ?? <SpinnerIcon />}
      </PrimitiveBuffering>
    );
  }
);
BufferingIndicator.displayName = "Video.BufferingIndicator";

export type SettingsMenuProps = MenuContentProps;

/** A menu of whatever plugins contribute to the `menu` slot. Hidden when empty. */
export function SettingsMenu({ children, ...props }: SettingsMenuProps) {
  const player = usePlayer();
  const label = useLabel("settings", "Settings");
  if (!children && player.slot("menu").length === 0) return null;
  return (
    <Menu>
      <MenuTrigger aria-label={label}>
        <SettingsIcon />
      </MenuTrigger>
      <MenuContent {...props}>{children ?? <Slot name="menu" />}</MenuContent>
    </Menu>
  );
}
SettingsMenu.displayName = "Video.SettingsMenu";
