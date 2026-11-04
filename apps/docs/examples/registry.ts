import type { ComponentType } from "react";
import Basic from "./basic";

export type Example = {
  slug: string;
  title: string;
  Component: ComponentType;
};

export const examples: Example[] = [
  { slug: "basic", title: "Basic", Component: Basic },
];
