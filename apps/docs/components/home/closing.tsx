import Link from "next/link";
import { ChevronIcon } from "@/components/site/icons";
import { Install } from "@/components/site/install";
import { ALPHA_PUBLISHED } from "@/lib/site";

export function Closing() {
  return (
    <section id="start" className="band site-section text-center">
      <div className="site-wrap reveal flex flex-col items-center">
        <h2 className="site-title">Start small.<br />Add the rest when you need it.</h2>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Link href="/docs/v4/getting-started" className="btn btn-primary press">
            Read the guide
          </Link>
          <Link href="/docs/v4/migration" className="more">
            Moving from v3
            <ChevronIcon />
          </Link>
        </div>
        <Install hero className="mt-14" />
        <p className="text-dim mt-5 text-[14px] leading-[1.45] tracking-[-0.008em]">
          Version 4 is in alpha, and its API can still change.{ALPHA_PUBLISHED ? null : " It isn't on npm yet."}
        </p>
      </div>
    </section>
  );
}
