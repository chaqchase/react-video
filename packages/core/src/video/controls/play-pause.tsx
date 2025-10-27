import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import Button from "../../ui/button";
import { Pause, Play } from "../../ui/icons";
import { useVideoContext } from "../context";

export type VideoPlayPauseProps = {
  /** Additional CSS classes */
  className?: string;
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Button border radius */
  radius?: "none" | "sm" | "md" | "lg" | "full";
  /** Custom play icon */
  playIcon?: React.ReactNode;
  /** Custom pause icon */
  pauseIcon?: React.ReactNode;
  /** Use child element instead of default button */
  asChild?: boolean;
  /** Custom children when asChild is true */
  children?: React.ReactNode;
};

/**
 * Toggle button for play/pause control.
 * Automatically hides when video is loading.
 *
 * @example
 * ```tsx
 * // Default usage
 * <Video.PlayPause />
 *
 * // With asChild for custom element
 * <Video.PlayPause asChild>
 *   <button className="my-custom-button">
 *     {isPlaying ? "Pause" : "Play"}
 *   </button>
 * </Video.PlayPause>
 * ```
 */
export function VideoPlayPause({
  className,
  size = "lg",
  radius = "full",
  playIcon,
  pauseIcon,
  asChild = false,
  children,
}: VideoPlayPauseProps) {
  const { isPlaying, handlePlay, handlePause, isLoading } = useVideoContext();

  if (isLoading) return null;

  const handleClick = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const ariaLabel = isPlaying ? "Pause video" : "Play video";
  const content = isPlaying ? pauseIcon || <Pause /> : playIcon || <Play />;

  if (asChild) {
    return (
      <Slot
        onClick={handleClick}
        aria-label={ariaLabel}
        className={cn("rv-z-50", className)}
      >
        {children}
      </Slot>
    );
  }

  return (
    <Button
      onClick={handleClick}
      size={size}
      radius={radius}
      className={cn("rv-z-50", className)}
      aria-label={ariaLabel}
    >
      {content}
    </Button>
  );
}

VideoPlayPause.displayName = "Video.PlayPause";
