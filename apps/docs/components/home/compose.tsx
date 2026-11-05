import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Eyebrow, SectionLead, SectionTitle } from "@/components/site/eyebrow";
import { Highlighted } from "@/components/site/highlighted";
import ComposeHeadless from "@/examples/compose-headless";
import ComposeParts from "@/examples/compose-parts";
import ComposeReady from "@/examples/compose-ready";
import { COMPLETE, kb, standalone } from "@/lib/sizes";
import { ComposeTabs } from "./compose-tabs";

const source = (name: string) => readFile(join(process.cwd(), "examples", `${name}.tsx`), "utf8");

export async function Compose() {
  const [ready, parts, headless] = await Promise.all(
    ["compose-ready", "compose-parts", "compose-headless"].map(source)
  );
  return (
    <section id="composition" className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
      <div className="reveal">
        <Eyebrow time="00:52">Composition</Eyebrow>
        <SectionTitle>Three ways in, and they all share one engine.</SectionTitle>
        <SectionLead>
          Start with a finished player today. Rearrange it next week. Replace every pixel when the design calls for it.
          Your plugins keep working at each step, because the layers underneath don&apos;t change.
        </SectionLead>
      </div>
      <ComposeTabs
        layers={[
          {
            id: "ready",
            label: "Ready-made",
            title: "One component, done.",
            description: "Every control, styled, in a layout that adapts from a phone to a cinema display.",
            importPath: "react-video-kit/player",
            size: kb(COMPLETE),
            code: <Highlighted code={ready as string} />,
            demo: <ComposeReady />,
          },
          {
            id: "parts",
            label: "Styled parts",
            title: "Your layout, our controls.",
            description: "Arrange the same styled parts however you like. Here, the timeline moves into the control row.",
            importPath: "react-video-kit",
            size: kb(standalone["styled parts"] as number),
            code: <Highlighted code={parts as string} />,
            demo: <ComposeParts />,
          },
          {
            id: "headless",
            label: "Headless",
            title: "Your pixels, our behaviour.",
            description: "Primitives bring focus, keyboard, ARIA, and state. This one is styled with nothing but Tailwind.",
            importPath: "react-video-kit/primitives",
            size: kb(standalone["headless (all primitives)"] as number),
            code: <Highlighted code={headless as string} />,
            demo: <ComposeHeadless />,
          },
        ]}
      />
    </section>
  );
}
