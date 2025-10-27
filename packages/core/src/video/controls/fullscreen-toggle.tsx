import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import Button from "../../ui/button";
import { ExitFullScreen, FullScreen } from "../../ui/icons";
import { useVideoContext } from "../context";

export type VideoFullscreenToggleProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  enterIcon?: React.ReactNode;
  exitIcon?: React.ReactNode;
  asChild?: boolean;
  children?: React.ReactNode;
};

export function VideoFullscreenToggle({
  className,
  size = "lg",
  radius = "full",
  enterIcon,
  exitIcon,
  asChild = false,
  children,
}: VideoFullscreenToggleProps) {
  const { isFullscreen, isPip, handleFullScreen, handleExitFullScreen } =
    useVideoContext();

  // Hide fullscreen toggle when in PiP mode
  if (isPip) return null;

  const handleClick = () => {
    if (isFullscreen) {
      handleExitFullScreen();
    } else {
      handleFullScreen();
    }
  };

  const ariaLabel = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";
  const content = isFullscreen
    ? exitIcon || <ExitFullScreen />
    : enterIcon || <FullScreen />;

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

VideoFullscreenToggle.displayName = "Video.FullscreenToggle";
