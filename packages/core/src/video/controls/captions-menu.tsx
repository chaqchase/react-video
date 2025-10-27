import { cn } from "@/lib/utils";
import { Dropdown, menuStyles } from "../../ui/dropdown";
import Button from "../../ui/button";
import { useVideoContext } from "../context";

export type VideoCaptionsMenuProps = {
  /** Additional CSS classes for the trigger button */
  className?: string;
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Button border radius */
  radius?: "none" | "sm" | "md" | "lg" | "full";
  /** Custom trigger content (defaults to "CC" text) */
  triggerContent?: React.ReactNode;
};

/**
 * Dropdown menu for selecting captions/subtitles.
 * Lists all available tracks plus an "Off" option.
 * Only renders if tracks are available.
 *
 * @example
 * ```tsx
 * <Video.Root src="video.mp4" tracks={[...]}>
 *   <Video.Footer>
 *     <Video.CaptionsMenu />
 *   </Video.Footer>
 * </Video.Root>
 * ```
 */
export function VideoCaptionsMenu({
  className,
  size = "md",
  radius = "md",
  triggerContent,
}: VideoCaptionsMenuProps) {
  const { tracks, activeTrackIndex, setActiveTrackIndex } = useVideoContext();

  // Don't render if no tracks available
  if (!tracks || tracks.length === 0) {
    return null;
  }

  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger asChild>
        <Button
          size={size}
          radius={radius}
          className={cn("rv-z-50", className)}
          aria-label="Captions menu"
        >
          {triggerContent || (
            <span className="rv-text-sm rv-font-semibold">CC</span>
          )}
        </Button>
      </Dropdown.Trigger>

      <Dropdown.Portal>
        <Dropdown.Content
          className={cn("rv-min-w-[140px]", menuStyles.container)}
          sideOffset={8}
          align="end"
        >
          {/* Off option */}
          <Dropdown.Item
            className={cn(
              menuStyles.item.base,
              menuStyles.item.hover,
              activeTrackIndex === null && menuStyles.item.active
            )}
            onSelect={() => setActiveTrackIndex(null)}
            role="menuitemradio"
            aria-checked={activeTrackIndex === null}
          >
            {activeTrackIndex === null && (
              <span className="rv-mr-2" aria-hidden="true">
                ✓
              </span>
            )}
            Off
          </Dropdown.Item>

          <Dropdown.Separator className={menuStyles.separator} />

          {/* Track options */}
          {tracks.map((track, index) => (
            <Dropdown.Item
              key={index}
              className={cn(
                menuStyles.item.base,
                menuStyles.item.hover,
                activeTrackIndex === index && menuStyles.item.active
              )}
              onSelect={() => setActiveTrackIndex(index)}
              role="menuitemradio"
              aria-checked={activeTrackIndex === index}
            >
              {activeTrackIndex === index && (
                <span className="rv-mr-2" aria-hidden="true">
                  ✓
                </span>
              )}
              {track.label || `Track ${index + 1}`}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

VideoCaptionsMenu.displayName = "Video.CaptionsMenu";
