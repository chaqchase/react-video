/** The ids headings get. `scripts/check-docs.mjs` checks links against the same rule. */
export const slugify = (heading: string) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-");

/** Repeated headings on a page get a number, so each id stays unique. */
export function createSlugger() {
  const seen = new Map<string, number>();
  return (heading: string) => {
    const slug = slugify(heading);
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    return count === 0 ? slug : `${slug}-${count}`;
  };
}
