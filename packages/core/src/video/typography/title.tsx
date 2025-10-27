import { cn } from "@/lib/utils";
import { useVideoContext } from "../context";

export type VideoTitleProps = {
  className?: string;
  children?: React.ReactNode;
};

export function VideoTitle({ className, children }: VideoTitleProps) {
  const { title } = useVideoContext();

  const content = children ?? title;

  if (!content) return null;

  return (
    <h2
      className={cn(
        "rv-text-[1rem] xl:rv-text-2xl rv-my-0 rv-font-semibold rv-text-white",
        className
      )}
    >
      {content}
    </h2>
  );
}

VideoTitle.displayName = "Video.Title";
