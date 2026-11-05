import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base },
    { url: `${base}/plugins` },
    { url: `${base}/playground` },
    ...source.getPages().map((page) => ({ url: `${base}${page.url}` })),
  ];
}
