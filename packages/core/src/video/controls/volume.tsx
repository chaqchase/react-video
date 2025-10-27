import { cn } from "@/lib/utils";
import * as RadixSlider from "@radix-ui/react-slider";
import { Slot } from "@radix-ui/react-slot";
import Button from "../../ui/button";
import { Volume as VolumeIcon } from "../../ui/icons";
import { useVideoContext } from "../context";

export type VideoVolumeButtonProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  icon?: React.ReactNode;
  asChild?: boolean;
  children?: React.ReactNode;
};

export function VideoVolumeButton({
  className,
  size = "lg",
  radius = "full",
  icon,
  asChild = false,
  children,
}: VideoVolumeButtonProps) {
  const { isMuted, volume, handleMute, handleUnmute } = useVideoContext();

  const handleClick = () => {
    if (isMuted) {
      handleUnmute();
    } else {
      handleMute();
    }
  };

  const ariaLabel = isMuted ? "Unmute" : "Mute";
  const content = icon || <VolumeIcon isMuted={isMuted} volume={volume} />;

  if (asChild) {
    return (
      <Slot
        onClick={handleClick}
        aria-label={ariaLabel}
        className={cn("rv-bg-transparent rv-z-50", className)}
      >
        {children}
      </Slot>
    );
  }

  return (
    <Button
      size={size}
      radius={radius}
      className={cn("rv-bg-transparent rv-z-50", className)}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      {content}
    </Button>
  );
}

VideoVolumeButton.displayName = "Video.Volume.Button";

export type VideoVolumeSliderProps = {
  className?: string;
  hideThumb?: boolean;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
};

export function VideoVolumeSlider({
  className,
  hideThumb = true,
  trackClassName,
  rangeClassName,
  thumbClassName,
}: VideoVolumeSliderProps) {
  const { volume, handleVolumeChange } = useVideoContext();

  const volumePercent = Math.round(volume * 100);
  const ariaValueText = `${volumePercent} percent`;

  return (
    <RadixSlider.Root
      className={cn(
        "rv-relative rv-z-50 rv-items-center rv-select-none rv-touch-none rv-w-full rv-h-5 rv-hidden lg:rv-flex lg:rv-w-16",
        className
      )}
      onValueChange={(value) => {
        if (value[0] !== undefined) {
          handleVolumeChange(value[0]);
        }
      }}
      value={[volume]}
      min={0}
      max={1}
      step={0.01}
      aria-label="Volume"
      aria-valuetext={ariaValueText}
    >
      <RadixSlider.Track
        className={cn(
          "rv-bg-white rv-backdrop-filter rv-overflow-hidden rv-backdrop-blur-sm rv-h-2.5 rv-bg-opacity-30 rv-relative rv-grow rv-rounded-full",
          trackClassName
        )}
      >
        <RadixSlider.Range
          className={cn(
            "rv-absolute rv-bg-white rv-rounded-full rv-h-full",
            rangeClassName
          )}
        />
      </RadixSlider.Track>
      {!hideThumb && (
        <RadixSlider.Thumb
          className={cn(
            "rv-block rv-w-5 rv-h-5 rv-bg-white rv-shadow-[0_2px_2px] rv-shadow-black rv-rounded-[10px] hover:rv-bg-white focus:rv-outline-none focus:rv-shadow-[0_0_0_2px] focus:rv-shadow-white/10",
            thumbClassName
          )}
          aria-label="Volume"
        />
      )}
    </RadixSlider.Root>
  );
}

VideoVolumeSlider.displayName = "Video.Volume.Slider";

// Export a combined namespace
export const VideoVolume = {
  Button: VideoVolumeButton,
  Slider: VideoVolumeSlider,
};
