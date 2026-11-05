import { Bench } from "@/components/home/bench";
import { Capabilities } from "@/components/home/capabilities";
import { Closing } from "@/components/home/closing";
import { Compose } from "@/components/home/compose";
import { Hero } from "@/components/home/hero";
import { Meter } from "@/components/home/meter";
import { Sizes } from "@/components/home/sizes";
import { ThemeLab } from "@/components/home/theme-lab";
import { PageTimeline } from "@/components/site/page-timeline";
import { KERNEL, kb } from "@/lib/sizes";

const CHAPTERS = [
  { id: "intro", title: "Intro" },
  { id: "plugins", title: "Plugins" },
  { id: "performance", title: "Performance" },
  { id: "composition", title: "Composition" },
  { id: "theming", title: "Theming" },
  { id: "capabilities", title: "Everything else" },
  { id: "size", title: "Size" },
  { id: "start", title: "Get started" },
];

export default function Home() {
  return (
    <div className="flex-1">
      <Hero kernel={kb(KERNEL, 0)} />
      <Bench />
      <Meter />
      <Compose />
      <ThemeLab />
      <Capabilities />
      <Sizes />
      <Closing />
      <PageTimeline chapters={CHAPTERS} />
    </div>
  );
}
