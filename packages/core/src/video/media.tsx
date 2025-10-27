import { cn } from "@/lib/utils";
import { useVideoContext } from "./context";

export type VideoMediaProps = {
  /** Additional CSS classes for the video element */
  className?: string;
};

/**
 * Renders the HTML video element with declarative source and track children.
 * Must be used inside Video.Root.
 *
 * @example
 * ```tsx
 * <Video.Root src="video.mp4">
 *   <Video.Media className="custom-video" />
 * </Video.Root>
 * ```
 */
export function VideoMedia({ className }: VideoMediaProps) {
  const { videoRef, src, tracks, poster, autoPlay, loop, isFullscreen } =
    useVideoContext();

  return (
    <video
      crossOrigin="anonymous"
      controls={false}
      playsInline
      ref={videoRef as React.RefObject<HTMLVideoElement>}
      loop={loop}
      className={cn(
        "rv-w-full rv-h-full",
        {
          "rv-rounded-xl": !isFullscreen,
        },
        className
      )}
      poster={poster}
      preload="metadata"
      autoPlay={autoPlay}
      style={{
        objectFit: "cover",
        objectPosition: "center",
        pointerEvents: "none",
      }}
    >
      {/* Declarative sources */}
      {typeof src === "string" ? (
        <source src={src} />
      ) : Array.isArray(src) ? (
        src.map((s) => (
          <source
            key={s.label || s.src}
            src={s.src}
            type={s.type}
            data-label={s.label}
          />
        ))
      ) : null}
      {/* Declarative tracks */}
      {tracks?.map((track, i) => (
        <track
          key={i}
          src={track.src}
          kind={track.kind}
          srcLang={track.srclang}
          label={track.label}
          default={track.default}
        />
      ))}
    </video>
  );
}

VideoMedia.displayName = "Video.Media";
