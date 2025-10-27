import { cn } from "@/lib/utils";
import { useVideoContext } from "../context";

export type VideoSubtitleProps = {
  className?: string;
  children?: React.ReactNode;
};

export function VideoSubtitle({ className, children }: VideoSubtitleProps) {
  const { subtitle } = useVideoContext();

  const content = children ?? subtitle;

  if (!content) return null;

  return (
    <p
      className={cn(
        "rv-text-[0.5rem] xl:rv-text-base rv-my-0 rv-text-white/80",
        className
      )}
    >
      {content}
    </p>
  );
}

VideoSubtitle.displayName = "Video.Subtitle";
