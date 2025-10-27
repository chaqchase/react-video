import { cn } from "@/lib/utils";
import { formatTime } from "../../lib/format-time";
import { useVideoContext } from "../context";

export type VideoTimeCurrentProps = {
  className?: string;
};

export function VideoTimeCurrent({ className }: VideoTimeCurrentProps) {
  const { currentTime } = useVideoContext();

  return (
    <p className={cn("rv-text-xs rv-text-white", className)}>
      {formatTime(currentTime)}
    </p>
  );
}

VideoTimeCurrent.displayName = "Video.Time.Current";

export type VideoTimeRemainingProps = {
  className?: string;
  negative?: boolean;
};

export function VideoTimeRemaining({
  className,
  negative = false,
}: VideoTimeRemainingProps) {
  const { remainingTime } = useVideoContext();

  return (
    <p className={cn("rv-text-xs rv-text-white", className)}>
      {formatTime(remainingTime, negative)}
    </p>
  );
}

VideoTimeRemaining.displayName = "Video.Time.Remaining";

// Export a combined namespace
export const VideoTime = {
  Current: VideoTimeCurrent,
  Remaining: VideoTimeRemaining,
};
