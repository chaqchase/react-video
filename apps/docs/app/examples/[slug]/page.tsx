import { notFound } from "next/navigation";
import { examples } from "@/examples/registry";

type Props = { params: Promise<{ slug: string }> };

// Chrome-free routes: docs pages embed these examples, and Playwright drives them.
export default async function ExamplePage(props: Props) {
  const { slug } = await props.params;
  const example = examples.find((candidate) => candidate.slug === slug);
  if (!example) notFound();

  return (
    <main style={{ width: "100%", maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <example.Component />
    </main>
  );
}

export function generateStaticParams() {
  return examples.map(({ slug }) => ({ slug }));
}
