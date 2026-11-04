"use client";

import { Fragment } from "react";
import type { SlotName } from "../core/types";
import { usePlayer } from "./context";

/** Renders what plugins contributed to `name`, in plugin order. */
export function Slot({ name }: { name: SlotName }) {
  const player = usePlayer();
  const parts = player.slot(name);
  return (
    <Fragment>
      {parts.map((Part, index) => (
        <Part key={index} />
      ))}
    </Fragment>
  );
}
Slot.displayName = "Video.Slot";
