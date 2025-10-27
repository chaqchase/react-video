import { cn } from "@/lib/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
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
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="rv-min-w-[160px] rv-bg-black/90 rv-backdrop-blur-sm rv-rounded-lg rv-p-1 rv-shadow-lg rv-border rv-border-white/10 rv-z-[100]"
          sideOffset={5}
          align="end"
        >
          {/* Off option */}
          <DropdownMenu.Item
            className={cn(
              "rv-text-sm rv-text-white rv-px-3 rv-py-2 rv-rounded rv-cursor-pointer rv-outline-none",
              "hover:rv-bg-white/10 focus:rv-bg-white/10",
              activeTrackIndex === null && "rv-bg-white/20"
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
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="rv-h-[1px] rv-bg-white/10 rv-my-1" />

          {/* Track options */}
          {tracks.map((track, index) => (
            <DropdownMenu.Item
              key={index}
              className={cn(
                "rv-text-sm rv-text-white rv-px-3 rv-py-2 rv-rounded rv-cursor-pointer rv-outline-none",
                "hover:rv-bg-white/10 focus:rv-bg-white/10",
                activeTrackIndex === index && "rv-bg-white/20"
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
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

VideoCaptionsMenu.displayName = "Video.CaptionsMenu";
