import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Api, ApiEntry, PluginApi, PluginList, PluginSummary } from "@/components/docs/api";
import { Demo } from "@/components/docs/demo";
import { ScrollArea } from "@/components/docs/scroll-area";
import { Tab, Tabs } from "@/components/docs/tabs";
import { TokenEditor } from "@/components/docs/token-editor";
import { CodeFrame } from "@/components/site/code-frame";
import { ChevronIcon, InfoIcon, WarnIcon } from "@/components/site/icons";
import { Install } from "@/components/site/install";

const heading = (Tag: "h2" | "h3" | "h4") =>
  function Heading({ id, children }: ComponentProps<"h2">) {
    return (
      <Tag id={id} className={`doc-${Tag}`}>
        <a className="doc-anchor" href={`#${id}`}>
          {children}
        </a>
      </Tag>
    );
  };

function Anchor({ href = "", children }: ComponentProps<"a">) {
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link className="doc-link" href={href}>
        {children}
      </Link>
    );
  }
  return (
    <a className="doc-link" href={href}>
      {children}
    </a>
  );
}

interface PreProps extends ComponentProps<"pre"> {
  "data-code"?: string;
  "data-lang"?: string;
  "data-title"?: string;
  "data-sample"?: number;
}

function Pre({ children, "data-code": code = "", "data-lang": lang, "data-title": title, "data-sample": sample }: PreProps) {
  return (
    <CodeFrame code={code} lang={lang} title={title} label={`Code sample ${sample}`} className="doc-block">
      <pre className="code-pre shiki-themed">{children}</pre>
    </CodeFrame>
  );
}

function Callout({ type, title, children }: { type?: string; title?: string; children: ReactNode }) {
  const Icon = type === "warn" ? WarnIcon : InfoIcon;
  return (
    <div role="note" className="doc-callout" data-type={type === "warn" ? "warn" : "info"}>
      <Icon />
      <div className="doc-callout-body">
        {title ? <p className="doc-callout-title">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

function Card({ title, href, children }: { title: string; href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="doc-card">
      <span className="doc-card-title">
        {title}
        <ChevronIcon width={12} height={12} />
      </span>
      {children ? <div className="doc-card-text">{children}</div> : null}
    </Link>
  );
}

/** Every element gets its own class, so nothing here can leak into a demo or a table inside the page. */
export const mdxComponents = {
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  a: Anchor,
  pre: Pre,
  p: (props: ComponentProps<"p">) => <p className="doc-p" {...props} />,
  ul: (props: ComponentProps<"ul">) => <ul className="doc-list" {...props} />,
  ol: (props: ComponentProps<"ol">) => <ol className="doc-list doc-list-numbered" {...props} />,
  li: (props: ComponentProps<"li">) => <li className="doc-item" {...props} />,
  strong: (props: ComponentProps<"strong">) => <strong className="doc-strong" {...props} />,
  blockquote: (props: ComponentProps<"blockquote">) => <blockquote className="doc-quote" {...props} />,
  hr: () => <hr className="doc-rule" />,
  table: (props: ComponentProps<"table">) => (
    <ScrollArea label="Table" className="doc-table-scroll">
      <table className="doc-table" {...props} />
    </ScrollArea>
  ),
  Api,
  ApiEntry,
  Callout,
  Card,
  Cards: ({ children }: { children: ReactNode }) => <div className="doc-cards">{children}</div>,
  Demo,
  Install,
  PluginApi,
  PluginList,
  PluginSummary,
  Step: ({ children }: { children: ReactNode }) => <div className="doc-step">{children}</div>,
  Steps: ({ children }: { children: ReactNode }) => <div className="doc-steps">{children}</div>,
  Tab,
  Tabs,
  TokenEditor,
} satisfies MDXComponents;
