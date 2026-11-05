"use client";

import * as Video from "react-video-kit";

const sources = [
  { src: "/media/sample-360.mp4", type: "video/mp4" },
  { src: "/media/sample-360.webm", type: "video/webm" },
];

export default function Basic() {
  return (
    <Video.Root src={sources}>
      <Video.Media width={640} height={360} />
      <Video.Controls>
        <Video.ControlRow>
          <Video.ControlGroup>
            <Video.PlayPause>
              <span aria-hidden="true">⏯</span>
            </Video.PlayPause>
            <Video.CurrentTime />
          </Video.ControlGroup>
        </Video.ControlRow>
      </Video.Controls>
    </Video.Root>
  );
}
