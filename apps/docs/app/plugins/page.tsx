import type { Metadata } from "next";
import { Gallery } from "@/components/site/gallery";
import { KERNEL, kb, LAYOUT } from "@/lib/sizes";

export const metadata: Metadata = {
  title: "Plugins",
  description: "Every feature of React Video Kit is a plugin. Pick the ones you need and see what they cost.",
};

export default function PluginsPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] flex-1 px-4 pt-14 pb-32 sm:px-6 sm:pt-20">
      <h1 className="text-[clamp(2.25rem,6vw,4rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance">
        Plugins
      </h1>
      <p className="text-dim mt-4 max-w-[60ch] text-[clamp(1rem,1.5vw,1.175rem)] leading-relaxed text-pretty">
        Everything past {kb(KERNEL, 0)} is one of these. Select a few to add up what they cost on top of the{" "}
        {kb(LAYOUT)} player layout, then take them to the playground.
      </p>
      <Gallery />
    </div>
  );
}
