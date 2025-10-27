import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import Button from "../../ui/button";
import { BackBy10, ForwardBy10 } from "../../ui/icons";
import { useVideoContext } from "../context";

export type VideoSeekBackProps = {
  className?: string;
  seconds?: number;
  size?: "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  icon?: React.ReactNode;
  asChild?: boolean;
  children?: React.ReactNode;
};

export function VideoSeekBack({
  className,
  seconds = 10,
  size = "lg",
  radius = "full",
  icon,
  asChild = false,
  children,
}: VideoSeekBackProps) {
  const { backBy, isLoading } = useVideoContext();

  if (isLoading) return null;

  const handleClick = () => backBy(seconds);
  const ariaLabel = `Seek back ${seconds} seconds`;

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
      size={size}
      radius={radius}
      onClick={handleClick}
      className={cn("rv-z-50", className)}
      aria-label={ariaLabel}
    >
      {icon || <BackBy10 />}
    </Button>
  );
}

VideoSeekBack.displayName = "Video.SeekBack";

export type VideoSeekForwardProps = {
  className?: string;
  seconds?: number;
  size?: "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  icon?: React.ReactNode;
  asChild?: boolean;
  children?: React.ReactNode;
};

export function VideoSeekForward({
  className,
  seconds = 10,
  size = "lg",
  radius = "full",
  icon,
  asChild = false,
  children,
}: VideoSeekForwardProps) {
  const { forwardBy, isLoading } = useVideoContext();

  if (isLoading) return null;

  const handleClick = () => forwardBy(seconds);
  const ariaLabel = `Seek forward ${seconds} seconds`;

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
      {icon || <ForwardBy10 />}
    </Button>
  );
}

VideoSeekForward.displayName = "Video.SeekForward";
