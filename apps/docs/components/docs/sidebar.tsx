"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronIcon, CloseIcon } from "@/components/site/icons";
import { SlidingMarker } from "./sliding-marker";
import type { DocVersion, NavNode } from "@/lib/docs/content";

type Group = { title?: string; pages: Extract<NavNode, { kind: "page" }>[] };

function toGroups(nodes: NavNode[]) {
  const groups: Group[] = [];
  for (const node of nodes) {
    if (node.kind === "label") groups.push({ title: node.title, pages: [] });
    else {
      if (groups.length === 0) groups.push({ pages: [] });
      groups.at(-1)?.pages.push(node);
    }
  }
  return groups;
}

interface TreeProps {
  versions: DocVersion[];
  version: DocVersion;
  pathname: string;
  onNavigate?: () => void;
}

function Tree({ versions, version, pathname, onNavigate }: TreeProps) {
  return (
    <>
      <div className="doc-versions">
        {versions.map(({ id, url, title }) => (
          <Link key={id} href={url} aria-current={id === version.id ? "true" : undefined} onClick={onNavigate}>
            {title}
          </Link>
        ))}
      </div>
      {toGroups(version.nodes).map(({ title, pages }, index) => (
        <div key={title ?? index}>
          {title ? <p className="doc-nav-label">{title}</p> : null}
          <ul>
            {pages.map(({ url, title: name }) => (
              <li key={url}>
                <Link href={url} className="doc-nav-link" aria-current={url === pathname ? "page" : undefined} onClick={onNavigate}>
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/** The docs' pages. It stays beside the article on wide screens and opens as a sheet on narrow ones. */
export function Sidebar({ versions }: { versions: DocVersion[] }) {
  const pathname = usePathname();
  const aside = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const version = versions.find(({ url }) => pathname === url || pathname.startsWith(`${url}/`)) ?? versions[0];

  useEffect(() => {
    const box = aside.current;
    const link = box?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!box || !link) return;
    const offset = link.offsetTop - box.scrollTop;
    if (offset < 0 || offset > box.clientHeight - link.offsetHeight) box.scrollTop = link.offsetTop - box.clientHeight / 2;
  }, [pathname]);

  useEffect(() => {
    if (sheetOpen) sheet.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "center" });
  }, [sheetOpen]);

  if (!version) return null;
  const current = version.nodes.find((node) => node.kind === "page" && node.url === pathname);

  return (
    <>
      <div className="doc-bar">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`All pages. This one is ${current?.title ?? "not listed"}`}
          onClick={() => {
            setSheetOpen(true);
            sheet.current?.showModal();
          }}
        >
          {current?.title ?? "Pages"}
          <ChevronIcon width={11} height={11} />
        </button>
      </div>
      <aside ref={aside} className="doc-sidebar">
        <nav aria-label="Documentation" className="doc-nav">
          <SlidingMarker selector='.doc-nav-link[aria-current="page"]' watch={pathname} className="doc-nav-marker" />
          <Tree versions={versions} version={version} pathname={pathname} />
        </nav>
      </aside>
      <dialog
        ref={sheet}
        aria-label="Documentation"
        className="doc-sheet"
        onClose={() => setSheetOpen(false)}
        onClick={(event) => {
          if (event.target === sheet.current) sheet.current.close();
        }}
      >
        <div className="doc-sheet-body">
          <button type="button" aria-label="Close" className="site-icon-button press doc-sheet-close" onClick={() => sheet.current?.close()}>
            <CloseIcon />
          </button>
          {sheetOpen ? (
            <nav aria-label="Documentation">
              <Tree versions={versions} version={version} pathname={pathname} onNavigate={() => sheet.current?.close()} />
            </nav>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
