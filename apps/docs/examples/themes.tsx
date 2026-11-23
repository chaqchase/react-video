"use client";

import { useState } from "react";
import { captions } from "react-video-kit/captions";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";
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

const THEMES = [
  { id: "default", label: "Apple TV" },
  { id: "youtube", label: "YouTube" },
  { id: "netflix", label: "Netflix" },
  { id: "disney", label: "Disney+" },
  { id: "prime", label: "Prime Video" },
  { id: "max", label: "HBO Max" },
  { id: "hulu", label: "Hulu" },
  { id: "vimeo", label: "Vimeo" },
  { id: "twitch", label: "Twitch" },
  { id: "spotify", label: "Spotify" },
  { id: "udemy", label: "Udemy" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "minimal", label: "Minimal" },
];

const plugins = [
  ...defaultPlugins().filter(({ name }) => name !== "captions"),
  captions({
    tracks: [
      { src: "/captions/nature.en.vtt", language: "en", label: "English" },
      { src: "/captions/nature.ar.vtt", language: "ar", label: "العربية" },
    ],
  }),
];

export default function Themes() {
  const [theme, setTheme] = useState("default");
  // These are made for vertical video, so show them with some.
  const vertical = theme === "tiktok" || theme === "instagram";
  return (
    <div className="flex flex-col">
      <div role="group" aria-label="Theme" className="flex flex-wrap gap-2">
        {THEMES.map(({ id, label }) => (
          <button key={id} type="button" aria-pressed={theme === id} onClick={() => setTheme(id)}>
            {label}
          </button>
        ))}
      </div>
      <VideoPlayer
        className={theme === "default" ? undefined : `rv-theme-${theme}`}
        src={vertical ? "/media/sample-vertical.mp4" : "/media/sample-720.mp4"}
        poster={vertical ? "/media/sample-vertical.jpg" : "/media/poster.jpg"}
        plugins={plugins}
        load="visible"
        eyebrow="S1 E1"
        title="The Green Coast"
      />
    </div>
  );
}
