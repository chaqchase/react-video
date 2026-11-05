import type { Metadata } from "next";
import { Footer } from "@/components/site/footer";
import { Gallery } from "@/components/site/gallery";
import { KERNEL, kb, LAYOUT } from "@/lib/sizes";

export const metadata: Metadata = {
  title: "Plugins",
  description: "Every feature of React Video Kit is a plugin. Pick the ones you need and see what they cost.",
};

export default function PluginsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="site-wrap flex-1 pt-16 pb-32 sm:pt-24">
        <h1 className="site-title">Plugins</h1>
        <p className="site-lead mt-5 max-w-[34em]">
          Everything past {kb(KERNEL, 0)} is one of these. Select a few to add up what they cost on top of the {kb(LAYOUT)}{" "}
          player layout, then take them to the playground.
        </p>
        <Gallery />
      </div>
      <Footer />
    </div>
  );
}
