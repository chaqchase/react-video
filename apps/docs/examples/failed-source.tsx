"use client";

import * as Video from "react-video-kit";

function ErrorMessage() {
  const error = Video.useVideoState((media) => media.error);
  return error ? <p role="alert">{error.message}</p> : null;
}

export default function FailedSource() {
  return (
    <Video.Root src="/media/broken.mp4" load="visible">
      <Video.Media width={640} height={360} />
      <ErrorMessage />
    </Video.Root>
  );
}
