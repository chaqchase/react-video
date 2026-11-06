import Link from "next/link";
import { ChevronIcon } from "@/components/site/icons";

interface Neighbour {
  title: string;
  url: string;
}

function PagerLink({ page, direction }: { page: Neighbour; direction: "previous" | "next" }) {
  const next = direction === "next";
  return (
    <Link
      href={page.url}
      className={`flex min-w-0 flex-1 flex-col gap-0.5 py-1 ${next ? "items-end text-end" : "items-start"}`}
    >
      <span className="text-dim text-[12.5px]">{next ? "Next" : "Previous"}</span>
      <span className={`inline-flex items-center gap-1 text-[14.5px] font-medium tracking-[-0.01em] ${next ? "" : "flex-row-reverse"}`}>
        {page.title}
        <ChevronIcon
          width={12}
          height={12}
          className={`text-dim ${next ? "" : "rotate-180"}`}
        />
      </span>
    </Link>
  );
}

/** Where to go from here. Page names only, since a cut-off description reads as a mistake. */
export function PagePager({ previous, next }: { previous?: Neighbour; next?: Neighbour }) {
  if (!previous && !next) return null;
  return (
    <nav aria-label="More pages" className="border-line mt-14 flex items-start justify-between gap-6 border-t pt-5">
      {previous ? <PagerLink page={previous} direction="previous" /> : <span className="flex-1" />}
      {next ? <PagerLink page={next} direction="next" /> : <span className="flex-1" />}
    </nav>
  );
}
