import { Bench } from "@/components/home/bench";
import { Capabilities } from "@/components/home/capabilities";
import { Closing } from "@/components/home/closing";
import { Compose } from "@/components/home/compose";
import { Hero } from "@/components/home/hero";
import { Meter } from "@/components/home/meter";
import { Sizes } from "@/components/home/sizes";
import { Statement } from "@/components/home/statement";
import { ThemeLab } from "@/components/home/theme-lab";
import { Footer } from "@/components/site/footer";
import { KERNEL, kb } from "@/lib/sizes";

export default function Home() {
  return (
    <div className="flex-1">
      <Hero kernel={kb(KERNEL, 0)} />
      <Statement />
      <Bench />
      <Meter />
      <Compose />
      <ThemeLab />
      <Capabilities />
      <Sizes />
      <Closing />
      <Footer />
    </div>
  );
}
