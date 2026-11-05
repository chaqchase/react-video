import Link from "next/link";
import { ALPHA_PUBLISHED } from "@/lib/site";

/** Version 4 is on the alpha tag, and readers should know before they build on it. */
export function AlphaNotice() {
  return (
    <p className="not-prose bg-sun-soft text-text mb-5 rounded-xl px-3.5 py-2.5 text-[13.5px] leading-snug">
      <strong className="font-semibold">Alpha.</strong> These docs describe version 4, which can still change between
      releases. <code className="font-mono text-[12.5px]">npm install react-video-kit</code> gets version 3 until it&apos;s
      stable, and its docs are <Link className="underline underline-offset-2" href="/docs/v3">here</Link>.
      {ALPHA_PUBLISHED ? null : " The first alpha isn't on npm yet, so these install commands won't work until it is."}
    </p>
  );
}
