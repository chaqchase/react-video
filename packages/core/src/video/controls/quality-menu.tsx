import { cn } from "@/lib/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Button from "../../ui/button";
import { useVideoContext } from "../context";

export type VideoQualityMenuProps = {
  /** Additional CSS classes for the trigger button */
  className?: string;
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Button border radius */
  radius?: "none" | "sm" | "md" | "lg" | "full";
  /** Custom trigger content (defaults to "HD" or current quality label) */
  triggerContent?: React.ReactNode;
};

/**
 * Dropdown menu for switching video quality/source.
 * Only renders when src is an array of sources with labels.
 * Preserves currentTime and play state when switching quality.
 *
 * @example
 * ```tsx
 * <Video.Root src={[
 *   { src: "video-sd.mp4", type: "video/mp4", label: "SD" },
 *   { src: "video-hd.mp4", type: "video/mp4", label: "HD" },
 * ]}>
 *   <Video.Footer>
 *     <Video.QualityMenu />
 *   </Video.Footer>
 * </Video.Root>
 * ```
 */
export function VideoQualityMenu({
  className,
  size = "md",
  radius = "md",
  triggerContent,
}: VideoQualityMenuProps) {
  const { src, qualityIndex, setQualityIndex } = useVideoContext();

  // Only render if src is an array (multiple quality levels)
  if (typeof src === "string" || !Array.isArray(src) || src.length <= 1) {
    return null;
  }

  const currentQuality = src[qualityIndex];
  const currentLabel = currentQuality?.label || "Quality";

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          size={size}
          radius={radius}
          className={cn("rv-z-50", className)}
          aria-label="Quality menu"
        >
          {triggerContent || (
            <span className="rv-text-sm rv-font-semibold">{currentLabel}</span>
          )}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="rv-min-w-[120px] rv-bg-black/90 rv-backdrop-blur-sm rv-rounded-lg rv-p-1 rv-shadow-lg rv-border rv-border-white/10 rv-z-[100]"
          sideOffset={5}
          align="end"
        >
          {src.map((source, index) => (
            <DropdownMenu.Item
              key={index}
              className={cn(
                "rv-text-sm rv-text-white rv-px-3 rv-py-2 rv-rounded rv-cursor-pointer rv-outline-none",
                "hover:rv-bg-white/10 focus:rv-bg-white/10",
                qualityIndex === index && "rv-bg-white/20"
              )}
              onSelect={() => setQualityIndex(index)}
              role="menuitemradio"
              aria-checked={qualityIndex === index}
            >
              {qualityIndex === index && (
                <span className="rv-mr-2" aria-hidden="true">
                  ✓
                </span>
              )}
              {source.label || `Source ${index + 1}`}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

VideoQualityMenu.displayName = "Video.QualityMenu";
