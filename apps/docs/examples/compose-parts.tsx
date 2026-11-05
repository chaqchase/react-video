"use client";

import * as Video from "react-video-kit";
import { fullscreen, Fullscreen } from "react-video-kit/fullscreen";
import { idle } from "react-video-kit/idle";
import { speed, SpeedMenu } from "react-video-kit/speed";

const plugins = [idle(), speed(), fullscreen()];

function SpeedTrigger() {
  const rate = Video.useVideoState((media) => media.rate);
  return <Video.MenuTrigger aria-label={`${rate}× speed`}>{rate}×</Video.MenuTrigger>;
}

export default function ComposeParts() {
  return (
    <Video.Root src="/media/sample-720.mp4" plugins={plugins} load="visible">
      <Video.Media poster="/media/poster.jpg" />
      <Video.PlayOverlay />
      <Video.Controls>
        <Video.ControlRow>
          <Video.ControlGroup>
            <Video.PlayPause />
          </Video.ControlGroup>
          <div style={{ flex: 1 }}>
            <Video.Timeline />
          </div>
          <Video.ControlGroup>
            <Video.Time />
            <Video.Menu>
              <SpeedTrigger />
              <Video.MenuContent>
                <SpeedMenu />
              </Video.MenuContent>
            </Video.Menu>
            <Fullscreen />
          </Video.ControlGroup>
        </Video.ControlRow>
      </Video.Controls>
    </Video.Root>
  );
}
