import { cn } from "@/lib/utils";
import { Loading as LoadingIcon } from "../../ui/icons";
import { useVideoContext } from "../context";

export type VideoLoadingProps = {
  className?: string;
  icon?: React.ReactNode;
};

export function VideoLoading({ className, icon }: VideoLoadingProps) {
  const { isLoading } = useVideoContext();

  if (!isLoading) return null;

  return (
    <div className={cn("rv-flex rv-justify-center rv-z-50", className)}>
      {icon || <LoadingIcon />}
    </div>
  );
}

VideoLoading.displayName = "Video.Loading";
