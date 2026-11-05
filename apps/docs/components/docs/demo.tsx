import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Highlighted } from "@/components/site/highlighted";
import { examples } from "@/examples/registry";
import { DemoFrame } from "./demo-frame";

/** Renders a real file from `examples/`, which is also what the browser tests drive. */
export async function Demo({ slug }: { slug: string }) {
  const example = examples.find((candidate) => candidate.slug === slug);
  if (!example) throw new Error(`No example named ${slug}`);
  const source = await readFile(join(process.cwd(), "examples", `${slug}.tsx`), "utf8");
  return (
    <DemoFrame
      id={`demo-${slug}`}
      slug={slug}
      source={source}
      preview={<example.Component />}
      code={<Highlighted code={source} />}
    />
  );
}
