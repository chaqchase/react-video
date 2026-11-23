import type { Metadata } from "next";
import { Playground } from "@/components/playground/playground";
import { parseConfig } from "@/components/playground/url-state";

export const metadata: Metadata = {
  title: "Playground",
  description: "Build a player from any source, plugins, layout, and tokens, and copy the code it generates.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PlaygroundPage({ searchParams }: Props) {
  const params = await searchParams;
  const flat = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : []))
  );
  return <Playground initial={parseConfig(flat)} />;
}
