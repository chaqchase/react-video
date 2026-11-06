"use client";

import { useMemo, useState } from "react";
import { i18n } from "react-video-kit/i18n";
import { ar } from "react-video-kit/i18n/ar";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

const button = "rounded-md border border-current px-3 py-1.5 text-sm text-current aria-pressed:font-semibold aria-pressed:underline";

export default function Languages() {
  const [locale, setLocale] = useState("en");
  const plugins = useMemo(
    () => [i18n({ locale, strings: locale === "ar" ? ar : {} }), ...defaultPlugins()],
    [locale]
  );

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Language" className="flex gap-2">
        <button type="button" className={button} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
          English
        </button>
        <button type="button" className={button} aria-pressed={locale === "ar"} onClick={() => setLocale("ar")}>
          Arabic
        </button>
      </div>
      {/* A player reads `plugins` once, so the key makes a new one for each language. */}
      <VideoPlayer key={locale} src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <p className="text-sm text-current opacity-80">
        Hover a control to read its label, or open the settings menu. In Arabic the controls swap sides,
        while the timeline and volume slider keep running left to right.
      </p>
    </div>
  );
}
