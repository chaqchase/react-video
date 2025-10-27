import { cn } from "@/lib/utils";
import * as RadixSlider from "@radix-ui/react-slider";
import { useVideoContext } from "../context";

export type VideoTimelineProps = {
  className?: string;
  hideThumb?: boolean;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
  bufferedClassName?: string;
};

export function VideoTimeline({
  className,
  hideThumb = true,
  trackClassName,
  rangeClassName,
  thumbClassName,
  bufferedClassName,
}: VideoTimelineProps) {
  const { currentTime, duration, handleSeek, buffered } = useVideoContext();

  const lastBufferedEnd = (() => {
    try {
      if (!buffered || buffered.length === 0) return 0;
      return buffered.end(buffered.length - 1) || 0;
    } catch {
      return 0;
    }
  })();
  const bufferedPercent = Math.max(
    0,
    Math.min(100, duration > 0 ? (lastBufferedEnd / duration) * 100 : 0)
  );

  // Format time for aria-valuetext
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins} minutes ${secs} seconds`;
  };

  const ariaValueText = `${formatTime(currentTime)} of ${formatTime(duration)}`;

  return (
    <RadixSlider.Root
      className={cn(
        "rv-relative rv-flex rv-items-center rv-select-none rv-touch-none rv-w-full",
        className
      )}
      onValueChange={(value) => {
        handleSeek(Number(value));
      }}
      value={[currentTime <= duration ? currentTime : 0]}
      min={0}
      max={duration}
      step={0.01}
      aria-label="Video timeline"
      aria-valuetext={ariaValueText}
    >
      <RadixSlider.Track
        className={cn(
          "rv-bg-white rv-backdrop-filter rv-overflow-hidden backdrop-blur-sm rv-h-2 lg:rv-h-3 rv-bg-opacity-20 rv-relative rv-grow rv-rounded-full",
          trackClassName
        )}
      >
        {/* Buffered range visualization */}
        <div
          className={cn(
            "rv-absolute rv-inset-y-0 rv-left-0 rv-bg-white rv-bg-opacity-30",
            bufferedClassName
          )}
          style={{ width: `${bufferedPercent}%` }}
          aria-hidden
        />
        <RadixSlider.Range
          className={cn(
            "rv-absolute rv-bg-white rv-h-full",
            hideThumb ? "rv-rounded-full" : "rv-rounded-none",
            rangeClassName
          )}
        />
      </RadixSlider.Track>
      {!hideThumb && (
        <RadixSlider.Thumb
          className={cn(
            "rv-block rv-w-3 rv-h-3 lg:rv-w-6 lg:rv-h-6 rv-bg-white rv-rounded-full hover:rv-bg-white focus:rv-outline-none focus:rv-shadow-[0_0_0_2px] focus:rv-shadow-white",
            thumbClassName
          )}
          aria-label="Seek"
        />
      )}
    </RadixSlider.Root>
  );
}

VideoTimeline.displayName = "Video.Timeline";
