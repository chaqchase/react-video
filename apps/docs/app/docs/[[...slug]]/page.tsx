import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlphaNotice } from "@/components/docs/alpha-notice";
import { PagePager } from "@/components/docs/page-pager";
import { mdxComponents } from "@/components/docs/prose";
import { Toc, TocInline } from "@/components/docs/toc";
import { compile } from "@/lib/docs/compile";
import { getNeighbours, getPage, getPages } from "@/lib/docs/content";

type Props = { params: Promise<{ slug?: string[] }> };

// Every page is built ahead of time, so anything else is a 404.
export const dynamicParams = false;

// The pages people start from. The version switcher says "alpha" on all the others.
const shouldWarn = (slug: string[] = []) => slug[0] === "v4" && (slug.length === 1 || ["getting-started", "migration"].includes(slug[1] ?? ""));

export default async function Page(props: Props) {
  const { slug } = await props.params;
  const page = getPage(slug);
  if (!page) notFound();

  const { MDX, toc } = await compile(page);
  const { previous, next } = getNeighbours(page);

  return (
    <div className="doc-page">
      <article className="doc-article">
        {shouldWarn(slug) ? <AlphaNotice /> : null}
        <h1 className="doc-title">{page.title}</h1>
        {page.description ? <p className="doc-description">{page.description}</p> : null}
        <TocInline items={toc} />
        <div className="doc-body">
          <MDX components={mdxComponents} />
        </div>
        <PagePager previous={previous} next={next} />
      </article>
      <Toc items={toc} />
    </div>
  );
}

export function generateStaticParams() {
  return getPages().map(({ slug }) => ({ slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const page = getPage(slug);
  if (!page) notFound();

  return { title: page.title, description: page.description };
}
