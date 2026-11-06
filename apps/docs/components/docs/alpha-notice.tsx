import Link from "next/link";
import { ALPHA_PUBLISHED } from "@/lib/site";

/** Version 4 is on the alpha tag, and readers should know before they build on it. */
export function AlphaNotice() {
  return (
    <p className="text-dim mb-4 text-[13px] leading-[1.5] tracking-[-0.006em]">
      Version 4 is in alpha. It can still change between releases
      {ALPHA_PUBLISHED ? "" : ", and it isn't on npm yet"}.{" "}
      <Link className="text-text underline decoration-[var(--site-line-strong)] underline-offset-3" href="/docs/v3">
        Version 3 docs
      </Link>
    </p>
  );
}
