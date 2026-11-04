import type { ComponentType } from "react";
import Basic from "./basic";
import FailedSource from "./failed-source";
import Fallback from "./fallback";
import SourceChange from "./source-change";

export type Example = {
  slug: string;
  title: string;
  Component: ComponentType;
};

export const examples: Example[] = [
  { slug: "basic", title: "Basic", Component: Basic },
  { slug: "fallback", title: "Fallback sources", Component: Fallback },
  { slug: "failed-source", title: "Failed source", Component: FailedSource },
  { slug: "source-change", title: "Changing the source", Component: SourceChange },
];
