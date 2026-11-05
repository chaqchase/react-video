"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface TitleProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** The video's name. */
  title?: ReactNode;
  /** A short line above the title, such as a series or an episode. */
  eyebrow?: ReactNode;
  /** A sentence or two about the video, which shows while it's paused. */
  description?: ReactNode;
}

/** The video's name, with an optional line above it and a description below. */
export const Title = forwardRef<HTMLDivElement, TitleProps>(function Title(
  { title, eyebrow, description, ...props },
  ref
) {
  return (
    <div ref={ref} data-part="title" {...props}>
      {eyebrow ? <span data-part="title-eyebrow">{eyebrow}</span> : null}
      {title ? <span data-part="title-text">{title}</span> : null}
      {description ? <span data-part="title-description">{description}</span> : null}
    </div>
  );
});
Title.displayName = "Video.Title";
