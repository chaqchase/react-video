import { loader } from "fumadocs-core/source";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { applyMdxPreset } from "fumadocs-mdx/config";
import { defineDocs } from "fumadocs-mdx/macro";
import { codeThemes } from "./code-theme";

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    mdxOptions: applyMdxPreset({ rehypeCodeOptions: { themes: codeThemes, defaultColor: false } }),
  },
  meta: { schema: metaSchema },
});

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});
