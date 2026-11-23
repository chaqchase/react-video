import Link from "next/link";
import { REPO } from "@/lib/site";

/** Fine print, as quiet as it can be while staying readable. */
export function Footer() {
  return (
    <footer className="bg-band text-dim text-[12px] leading-[1.5] tracking-[-0.006em]">
      <div className="site-wrap flex flex-col gap-4 py-6">
        <p className="border-line border-b pb-4">
          Demo footage is the View From A Blue Moon trailer, which belongs to its makers and isn&apos;t covered by this
          project&apos;s licence.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <p>React Video Kit</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1">
            <Link className="hover:text-text transition-colors" href="/docs/v4">Docs</Link>
            <Link className="hover:text-text transition-colors" href="/plugins">Plugins</Link>
            <Link className="hover:text-text transition-colors" href="/playground">Playground</Link>
            <Link className="hover:text-text transition-colors" href="/docs/v3">v3 docs</Link>
            <a className="hover:text-text transition-colors" href={REPO}>GitHub</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
