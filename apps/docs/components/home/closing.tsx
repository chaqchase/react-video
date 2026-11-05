import Link from "next/link";
import { Eyebrow } from "@/components/site/eyebrow";
import { ArrowIcon } from "@/components/site/icons";
import { Install } from "@/components/site/install";
import { ALPHA_PUBLISHED, REPO } from "@/lib/site";

export function Closing() {
  return (
    <section id="start" className="relative isolate overflow-hidden">
      <div className="mx-auto max-w-[1120px] px-4 pt-20 pb-28 sm:px-6 sm:pt-28">
        <div className="reveal">
          <Eyebrow time="01:45">Get started</Eyebrow>
          <h2 className="max-w-[16ch] text-[clamp(2.25rem,6vw,4.5rem)] leading-[1] font-semibold tracking-[-0.04em] text-balance">
            Start small. Add the rest when you need it.
          </h2>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/docs/v4/getting-started" className="btn btn-primary press">
              Read the guide
              <ArrowIcon />
            </Link>
            <Link href="/docs/v4/migration" className="btn btn-ghost press">
              Moving from v3
            </Link>
          </div>
          <Install className="mt-6" />
          <p className="text-dim mt-5 max-w-[60ch] text-[14px] leading-relaxed">
            Version 4 is alpha software on the <code className="font-mono text-[13px]">alpha</code> tag, and its API can still
            change. <code className="font-mono text-[13px]">latest</code> on npm stays on 3.x until it&apos;s ready.
            {ALPHA_PUBLISHED ? null : " The first alpha isn't on npm yet, so this command won't work until it is."}
          </p>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-[420px] bg-[radial-gradient(60%_80%_at_50%_100%,var(--site-sun-soft),transparent_75%)]"
      />
      <footer className="border-line border-t">
        <div className="text-dim mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-7 pb-20 text-[13.5px] sm:px-6 sm:pb-7">
          <p>React Video Kit. The film on this page is generated with ffmpeg, with no footage or stock.</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <Link className="hover:text-text transition-colors" href="/docs/v4">Docs</Link>
            <Link className="hover:text-text transition-colors" href="/plugins">Plugins</Link>
            <Link className="hover:text-text transition-colors" href="/playground">Playground</Link>
            <Link className="hover:text-text transition-colors" href="/docs/v3">v3 docs</Link>
            <a className="hover:text-text transition-colors" href={REPO}>GitHub</a>
          </nav>
        </div>
      </footer>
    </section>
  );
}
