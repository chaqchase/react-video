import type { ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

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
    <Icon {...props}>
      <path d="M7.5 4.6c0-1 1.1-1.7 2-1.1l10.2 6.9c.8.5.8 1.7 0 2.2L9.5 19.5c-.9.6-2 0-2-1.1V4.6Z" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6" y="4" width="4.2" height="16" rx="1.4" />
      <rect x="13.8" y="4" width="4.2" height="16" rx="1.4" />
    </Icon>
  );
}

export function ReplayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5V2.6c0-.5-.6-.8-1-.5L6.7 5.3c-.3.2-.3.7 0 1L11 9.5c.4.3 1 0 1-.5V7a6 6 0 1 1-5.8 7.5 1 1 0 0 0-1.9.5A8 8 0 1 0 12 5Z" />
    </Icon>
  );
}

/** Each sound wave has a `data-wave`, so the skin can animate the volume level. */
export function VolumeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 5.2c0-.8-1-1.3-1.6-.7L6.1 7.4c-.2.2-.4.3-.7.3H4.2C3.5 7.7 3 8.2 3 8.9v6.2c0 .7.5 1.2 1.2 1.2h1.2c.3 0 .5.1.7.3l3.3 2.9c.6.6 1.6.1 1.6-.7V5.2Z" />
      <path
        data-wave="low"
        d="M14.2 8.8a1 1 0 0 1 1.4 0 4.5 4.5 0 0 1 0 6.4 1 1 0 0 1-1.4-1.4 2.5 2.5 0 0 0 0-3.6 1 1 0 0 1 0-1.4Z"
      />
      <path
        data-wave="high"
        d="M17 6a1 1 0 0 1 1.4 0 8.5 8.5 0 0 1 0 12 1 1 0 0 1-1.4-1.4 6.5 6.5 0 0 0 0-9.2A1 1 0 0 1 17 6Z"
      />
      <path
        data-wave="slash"
        d="M21.3 9.3a1 1 0 0 1 0 1.4L19.9 12l1.4 1.3a1 1 0 0 1-1.4 1.4l-1.4-1.3-1.3 1.3a1 1 0 0 1-1.4-1.4l1.3-1.3-1.3-1.3a1 1 0 0 1 1.4-1.4l1.3 1.3 1.4-1.3a1 1 0 0 1 1.3 0Z"
      />
    </Icon>
  );
}

export function FullscreenEnterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 9a1 1 0 0 1-2 0V5.5A2.5 2.5 0 0 1 5.500 3H9a1 1 0 0 1 0 2H5.500a.5.5 0 0 0-.5.5V9Zm14 0V5.500a.5.5 0 0 0-.5-.5H15a1 1 0 1 1 0-2h3.500A2.500 2.500 0 0 1 21 5.500V9a1 1 0 1 1-2 0ZM5 15v3.500c0 .3.2.5.5.5H9a1 1 0 1 1 0 2H5.500A2.500 2.500 0 0 1 3 18.500V15a1 1 0 1 1 2 0Zm14 0a1 1 0 1 1 2 0v3.500a2.500 2.500 0 0 1-2.500 2.500H15a1 1 0 1 1 0-2h3.500a.5.5 0 0 0 .5-.5V15Z" />
    </Icon>
  );
}

export function FullscreenExitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 3a1 1 0 0 1 1 1v3.500A2.500 2.500 0 0 1 7.500 10H4a1 1 0 0 1 0-2h3.500a.5.5 0 0 0 .5-.5V4a1 1 0 0 1 1-1Zm6 0a1 1 0 0 1 1 1v3.500c0 .3.2.5.5.5H20a1 1 0 1 1 0 2h-3.500A2.500 2.500 0 0 1 14 7.500V4a1 1 0 0 1 1-1ZM3 15a1 1 0 0 1 1-1h3.500a2.500 2.500 0 0 1 2.500 2.500V20a1 1 0 1 1-2 0v-3.500a.5.5 0 0 0-.5-.5H4a1 1 0 0 1-1-1Zm11 1.500a2.500 2.500 0 0 1 2.500-2.500H20a1 1 0 1 1 0 2h-3.500a.5.5 0 0 0-.5.5V20a1 1 0 1 1-2 0v-3.500Z" />
    </Icon>
  );
}

export function PipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Zm0 2h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
      <rect x="11.500" y="11.500" width="7" height="5" rx="1" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        fillRule="evenodd"
        d="M10.200 2.700a1.800 1.800 0 0 1 3.600 0l.1.700c.1.500.7.800 1.200.6l.7-.3a1.800 1.800 0 0 1 2.300.8l.1.100a1.800 1.800 0 0 1-.5 2.400l-.6.400c-.4.300-.4.900 0 1.200l.6.400a1.800 1.800 0 0 1 .5 2.400l-.1.100a1.800 1.800 0 0 1-2.300.8l-.7-.3c-.5-.2-1.100.1-1.200.6l-.1.700a1.800 1.800 0 0 1-3.600 0l-.1-.700c-.1-.5-.7-.8-1.200-.6l-.7.3a1.800 1.800 0 0 1-2.300-.8l-.1-.1a1.800 1.800 0 0 1 .5-2.400l.6-.4c.4-.3.4-.9 0-1.200l-.6-.4a1.800 1.800 0 0 1-.5-2.400l.1-.1a1.800 1.800 0 0 1 2.300-.8l.7.3c.5.2 1.100-.1 1.200-.6l.1-.7ZM12 11.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5Z"
        transform="translate(0 3)"
      />
    </Icon>
  );
}

export function SpinnerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9.500" stroke="currentColor" strokeOpacity=".22" strokeWidth="2.500" />
      <path
        d="M12 2.500a9.500 9.500 0 0 1 9.500 9.500"
        stroke="currentColor"
        strokeWidth="2.500"
        strokeLinecap="round"
      />
    </svg>
  );
}
