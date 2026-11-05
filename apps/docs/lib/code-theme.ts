import type { HighlightOptions } from "fumadocs-core/highlight";

type Theme = Extract<HighlightOptions, { themes: unknown }>["themes"][string];

// One palette for all code on the site. Both themes meet AA on their backgrounds.
const theme = (
  name: string,
  type: "light" | "dark",
  c: { fg: string; dim: string; keyword: string; string: string; fn: string; tag: string; num: string }
): Theme => ({
  name,
  type,
  colors: { "editor.foreground": c.fg, "editor.background": "#00000000" },
  settings: [
    { settings: { foreground: c.fg } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: c.dim, fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.operator.new", "keyword.control"], settings: { foreground: c.keyword } },
    { scope: ["string", "string.quoted", "string.template", "punctuation.definition.string"], settings: { foreground: c.string } },
    { scope: ["constant.numeric", "constant.language", "support.constant"], settings: { foreground: c.num } },
    { scope: ["entity.name.function", "support.function", "meta.function-call", "variable.function"], settings: { foreground: c.fn } },
    { scope: ["entity.name.tag", "support.class.component", "entity.name.type", "support.type", "entity.name.class"], settings: { foreground: c.tag } },
    { scope: ["entity.other.attribute-name", "variable.other.property", "support.type.property-name", "meta.object-literal.key"], settings: { foreground: c.fg } },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: c.dim } },
  ],
});

export const duskLight = theme("dusk-light", "light", {
  fg: "#17132b",
  dim: "#5e5873",
  keyword: "#5a45cf",
  string: "#a8450c",
  fn: "#8a3a8f",
  tag: "#2f5fa8",
  num: "#a8450c",
});

export const duskDark = theme("dusk-dark", "dark", {
  fg: "#f3f0fb",
  dim: "#a8a3bd",
  keyword: "#b4a7f7",
  string: "#ffb27a",
  fn: "#ee9fd6",
  tag: "#8fc4ff",
  num: "#ffb27a",
});

export const codeThemes = { light: duskLight, dark: duskDark };
