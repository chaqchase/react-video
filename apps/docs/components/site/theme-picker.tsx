"use client";

import { THEMES, type ThemeId } from "@/lib/themes";
// A picker's whole point is to show them all, so it brings their styles along.
import "react-video-kit/themes/disney.css";
import "react-video-kit/themes/hulu.css";
import "react-video-kit/themes/instagram.css";
import "react-video-kit/themes/max.css";
import "react-video-kit/themes/minimal.css";
import "react-video-kit/themes/netflix.css";
import "react-video-kit/themes/prime.css";
import "react-video-kit/themes/spotify.css";
import "react-video-kit/themes/tiktok.css";
import "react-video-kit/themes/twitch.css";
import "react-video-kit/themes/udemy.css";
import "react-video-kit/themes/vimeo.css";
import "react-video-kit/themes/youtube.css";

interface ThemePickerProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
  className?: string;
}

/** They wrap onto a second line in a narrow column, which a sliding thumb couldn't do. */
export function ThemePicker({ value, onChange, className = "" }: ThemePickerProps) {
  return (
    <div role="group" aria-label="Player theme" className={`flex flex-wrap gap-1.5 ${className}`}>
      {THEMES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`press h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200 ${
            value === id ? "bg-[var(--site-thumb)] text-text" : "text-dim hover:text-text bg-[var(--site-segment)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
