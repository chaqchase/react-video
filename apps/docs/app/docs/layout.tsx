import type { ReactNode } from "react";
import { Sidebar } from "@/components/docs/sidebar";
import { SiteNav } from "@/components/site/nav";
import { getVersions } from "@/lib/docs/content";
import "./docs.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteNav />
      <div className="doc-shell">
        <Sidebar versions={getVersions()} />
        <main className="doc-main">{children}</main>
      </div>
    </>
  );
}
