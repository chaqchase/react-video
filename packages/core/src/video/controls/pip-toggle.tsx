import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import Button from "../../ui/button";
import { EnterPip, ExitPip } from "../../ui/icons";
import { useVideoContext } from "../context";

export type VideoPipToggleProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  enterIcon?: React.ReactNode;
  exitIcon?: React.ReactNode;
  asChild?: boolean;
  children?: React.ReactNode;
};

export function VideoPipToggle({
  className,
  size = "lg",
  radius = "full",
  enterIcon,
  exitIcon,
  asChild = false,
  children,
}: VideoPipToggleProps) {
  const { isPip, isFullscreen, handlePip, handleExitPip } = useVideoContext();

  // Hide PiP toggle when in fullscreen mode
  if (isFullscreen) return null;

  const handleClick = () => {
    if (isPip) {
      handleExitPip();
    } else {
      handlePip();
    }
  };

  const ariaLabel = isPip
    ? "Exit picture-in-picture"
    : "Enter picture-in-picture";
  const content = isPip ? exitIcon || <ExitPip /> : enterIcon || <EnterPip />;

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

VideoPipToggle.displayName = "Video.PipToggle";
