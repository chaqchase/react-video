import type { ReactNode } from "react";
import { SiteNav } from "./nav";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
