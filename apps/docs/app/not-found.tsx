import type { Metadata } from "next";
import Link from "next/link";
import { ChevronIcon } from "@/components/site/icons";
import { SiteLayout } from "@/components/site/site-layout";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <SiteLayout>
      <div className="site-wrap flex flex-1 flex-col items-center justify-center py-32 text-center">
        <h1 className="site-title">This page isn&apos;t here.</h1>
        <p className="site-lead mt-4">It may have moved when the docs did.</p>
        <Link className="more mt-6" href="/docs/v4">
          Go to the docs
          <ChevronIcon width={12} height={12} />
        </Link>
      </div>
    </SiteLayout>
  );
}
