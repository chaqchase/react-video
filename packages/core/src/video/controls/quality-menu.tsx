import { cn } from "@/lib/utils";
import { Dropdown, menuStyles } from "../../ui/dropdown";
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
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger asChild>
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
      </Dropdown.Trigger>

      <Dropdown.Portal>
        <Dropdown.Content
          className={cn("rv-min-w-[100px]", menuStyles.container)}
          sideOffset={8}
          align="end"
        >
          {src.map((source, index) => (
            <Dropdown.Item
              key={index}
              className={cn(
                menuStyles.item.base,
                menuStyles.item.hover,
                qualityIndex === index && menuStyles.item.active
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
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

VideoQualityMenu.displayName = "Video.QualityMenu";
