"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { AsChild } from "./as-child";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Merges behaviour onto the single child instead of rendering a button. */
  asChild?: boolean;
}

/** A control button. `data-control` is what the skin styles. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { asChild, ...props },
  ref
) {
  return asChild ? (
    <AsChild ref={ref} data-control="" {...props} />
  ) : (
    <button ref={ref} type="button" data-control="" {...props} />
  );
});
Button.displayName = "Video.Button";
