import type { ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

const SEEK_RING = "M11.6 3.35A9.05 9.05 0 1 1 5.1 5.2";
const SEEK_ARROW = "M12 1l.300 6.6L7.5 3.9Z";
const PIP_FRAME = "M22.2 11V7.8a5 5 0 0 0-5-5H6.8a5 5 0 0 0-5 5v8.4a5 5 0 0 0 5 5h4.6";

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon viewBox="0 0 16 17" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" {...props}>
      <path d="M2.1 1.9 14.3 8.5 2.1 15.1Z" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon viewBox="0 0 13 16" {...props}>
      <rect x=".25" width="5.1" height="16" rx="1.3" />
      <rect x="7.65" width="5.1" height="16" rx="1.3" />
    </Icon>
  );
}

export function ReplayIcon(props: IconProps) {
  return (
    <StrokeIcon viewBox="0 0 21 25" {...props}>
      <path d={SEEK_RING} />
      <path d={SEEK_ARROW} fill="currentColor" strokeWidth=".8" />
    </StrokeIcon>
  );
}

/**
 * The speaker. The skin reads `--rv-volume` from the mute button, so each wave fades with
 * the level, and the slash falls across the speaker when it's muted.
 */
export function VolumeIcon(props: IconProps) {
  return (
    <Icon viewBox="0 0 512 512" {...props}>
      <path d="M232,416a24,24,0,0,1-14-5,8,8,0,0,1-1-1L126,336H56a24,24,0,0,1-24-24V200a24,24,0,0,1,24-24h70l91-75a8,8,0,0,1,1-1A24,24,0,0,1,256,120V392a24,24,0,0,1-24,24ZM126,336Zm0-160Z" />
      <path data-wave="slash" d="M452,38c-10-10-26-9-35,0L76,386c-10,10-9,26,0,35c5,5,11,7,17,7c6,0,13-3,18-8L453,73C462,63,462,48,452,38z" />
      <g data-wave="all">
        <path data-wave="low" d="M320,336a16,16,0,0,1-14-23c9-19,14-38,14-57,0-19-5-38-14-57a16,16,0,0,1,29-15C346,208,352,231,352,256c0,24-6,48-18,71A16,16,0,0,1,320,336Z" />
        <path data-wave="mid" d="M368,384a16,16,0,0,1-14-24C373,327,384,300,384,256c0-44-11-72-30-104a16,16,0,0,1,28-16C403,172,416,205,416,256c0,50-13,83-34,120A16,16,0,0,1,368,384Z" />
        <path data-wave="high" d="M416,432a16,16,0,0,1-13-25C430,365,448,324,448,256c0-67-18-109-45-151a16,16,0,1,1,27-17C460,135,480,182,480,256c0,65-15,114-51,169A16,16,0,0,1,416,432Z" />
      </g>
    </Icon>
  );
}

/** Drawn in strokes, which stay crisp at any size and take a fraction of the bytes. */
function StrokeIcon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <Icon fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </Icon>
  );
}

export function FullscreenEnterIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M22 14c0 3.770 0 5.660-1.170 6.830C19.660 22 17.770 22 14 22M10 22c-3.770 0-5.660 0-6.830-1.170C2 19.660 2 17.770 2 14M10 2C6.230 2 4.340 2 3.170 3.170 2 4.340 2 6.230 2 10M14 2c3.770 0 5.660 0 6.830 1.170C22 4.340 22 6.230 22 10" />
    </StrokeIcon>
  );
}

export function FullscreenExitIcon(props: IconProps) {
  return (
    <StrokeIcon viewBox="1.5 1.5 12 12" strokeWidth="1.05" {...props}>
      <path d="M5.6 2.2v2.4a1 1 0 0 1-1 1H2.2M9.4 2.2v2.4a1 1 0 0 0 1 1h2.4M5.6 12.8v-2.4a1 1 0 0 0-1-1H2.2M9.4 12.8v-2.4a1 1 0 0 1 1-1h2.4" />
    </StrokeIcon>
  );
}

export function PipEnterIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="1.6" {...props}>
      <path d={PIP_FRAME} />
      <rect x="13.25" y="13.15" width="8.9" height="7.9" rx="2.2" />
      <path d="M7 8l4.5 4.5m.25-4v4.25H7.5" />
    </StrokeIcon>
  );
}

export function PipExitIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="1.6" {...props}>
      <path d={PIP_FRAME} />
      <rect x="13.25" y="13.15" width="8.9" height="7.9" rx="2.2" />
      <path d="M12 12.5 7.5 8m-.25 4V7.75h4.25" />
    </StrokeIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="19" cy="12" r="1.9" />
    </Icon>
  );
}

const SPINNER_TICKS = [0, 1, 2, 3, 4, 5, 6, 7];

/** Eight ticks, fading around the circle. The skin turns it one tick at a time. */
export function SpinnerIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2.2" {...props}>
      {SPINNER_TICKS.map((tick) => (
        <path key={tick} d="M12 3v4.200" opacity={(tick + 1) / 8} transform={`rotate(${tick * 45} 12 12)`} />
      ))}
    </StrokeIcon>
  );
}

/** A ring with an arrowhead, turning back or forward, and the seconds in the middle. */
export function SeekIcon({
  seconds,
  ...props
}: IconProps & {
  /** The seconds shown in the ring, with a negative number turning the arrow back. */
  seconds: number;
}) {
  const amount = Math.abs(seconds);
  return (
    <StrokeIcon viewBox="0 0 21 25" strokeWidth="1.7" {...props}>
      <g transform={seconds < 0 ? undefined : "matrix(-1 0 0 1 21 0)"}>
        <path d={SEEK_RING} />
        <path d={SEEK_ARROW} fill="currentColor" strokeWidth=".8" />
      </g>
      {amount === 10 ? (
        <g strokeWidth="1.45">
          <path d="M5.9 11.2 8 9.8v7" />
          <ellipse cx="13" cy="13.2" rx="2.15" ry="3.3" />
        </g>
      ) : (
        <text x="10.5" y="16" fontSize="9" fontWeight="600" textAnchor="middle" fill="currentColor" stroke="none">
          {amount}
        </text>
      )}
    </StrokeIcon>
  );
}

export function CaptionsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        fillRule="evenodd"
        d="M5 4a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Zm3.750 5a3 3 0 1 0 2.120 5.120 1 1 0 1 0-1.410-1.410 1 1 0 1 1 0-1.420 1 1 0 0 0 1.410-1.410A3 3 0 0 0 8.750 9Zm6.500 0a3 3 0 1 0 2.120 5.120 1 1 0 1 0-1.410-1.410 1 1 0 1 1 0-1.420 1 1 0 0 0 1.410-1.410A3 3 0 0 0 15.250 9Z"
      />
    </Icon>
  );
}

export function NextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 5.600c0-1 1.100-1.600 1.900-1l8.100 5.900V5.500a1 1 0 1 1 2 0v13a1 1 0 1 1-2 0v-5l-8.100 5.900c-.8.600-1.900 0-1.900-1V5.600Z" />
    </Icon>
  );
}

export function PreviousIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 5.600c0-1-1.100-1.600-1.900-1L9 10.500V5.500a1 1 0 1 0-2 0v13a1 1 0 1 0 2 0v-5l8.100 5.900c.8.600 1.900 0 1.900-1V5.600Z" />
    </Icon>
  );
}

export function AirPlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h1.500l1.700-2H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-3.200l1.700 2H19a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Z" />
      <path d="M11.200 13.400c.4-.5 1.200-.5 1.600 0l4.300 5a1 1 0 0 1-.8 1.600H7.700a1 1 0 0 1-.8-1.600l4.300-5Z" />
    </Icon>
  );
}

export function CastIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4a3 3 0 0 0-3 3v1.500a1 1 0 0 0 2 0V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-5.500a1 1 0 1 0 0 2H19a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Z" />
      <path d="M3 11a1 1 0 0 0 0 2 6 6 0 0 1 6 6 1 1 0 1 0 2 0 8 8 0 0 0-8-8Zm0 4a1 1 0 1 0 0 2 2 2 0 0 1 2 2 1 1 0 1 0 2 0 4 4 0 0 0-4-4Zm0 3.200a1.400 1.400 0 1 0 0 2.800 1.400 1.400 0 0 0 0-2.800Z" />
    </Icon>
  );
}
