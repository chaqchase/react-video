"use client";

import * as Video from "react-video-kit";

function ErrorMessage() {
  const error = Video.useVideoState((media) => (media.error?.fatal ? media.error : null));
  return error ? (
    <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 p-6 text-center text-white">
      <p className="text-sm font-medium">Sorry, this video didn&apos;t load.</p>
      <p className="max-w-md text-xs opacity-70">Quote {error.code} if you contact support.</p>
    </div>
  ) : null;
}

export default function FailedSource() {
  return (
    <Video.Root src="/media/broken.mp4" load="visible">
      <Video.Media width={640} height={360} poster="/media/poster.jpg" />
      <ErrorMessage />
    </Video.Root>
  );
}
