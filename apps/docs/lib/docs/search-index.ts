import { getPages, type DocPage } from "./content";
import { createSlugger } from "./slug";
import type { SearchEntry } from "./search";

/** Prose only. Code, tags, and link targets would match words nobody is reading. */
const plain = (source: string) =>
  source
    .replace(/<[^>]+>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_|]/g, "")
    .replace(/^[-:\s]+$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();

function entriesFor(page: DocPage): SearchEntry[] {
  const slug = createSlugger();
  const prose = page.body.replace(/^ *```[\s\S]*?^ *```/gm, "");
  const sections = prose.split(/^(?=#{2,3}\s)/m);
  const lead = /^#{2,3}\s/.test(sections[0] ?? "")
    ? ""
    : (sections.shift() ?? "");
  return [
    {
      url: page.url,
      page: page.title,
      text: plain(`${page.description} ${lead}`).slice(0, 240),
    },
    ...sections.map((section) => {
      const [line = "", ...rest] = section.split("\n");
      const heading = plain(line.replace(/^#+\s*/, ""));
      return {
        url: `${page.url}#${slug(heading)}`,
        page: page.title,
        heading,
        text: plain(rest.join(" ")).slice(0, 240),
      };
    }),
  ];
}

/** Every page and section, built once when the site is, since the docs never change at run time. */
export const searchIndex = () => getPages().flatMap(entriesFor);
