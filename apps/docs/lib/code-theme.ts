import type { ThemeRegistrationRaw } from "shiki";

// One palette for all code on the site, where each kind of token reads differently. Both meet AA on their backgrounds.
const theme = (
  name: string,
  type: "light" | "dark",
  c: { fg: string; dim: string; keyword: string; string: string; fn: string; tag: string; attr: string; num: string }
): ThemeRegistrationRaw => ({
  name,
  type,
  colors: { "editor.foreground": c.fg, "editor.background": "#00000000" },
  settings: [
    { settings: { foreground: c.fg } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: c.dim } },
    { scope: ["keyword", "storage", "storage.type", "keyword.operator.new", "keyword.control"], settings: { foreground: c.keyword } },
    { scope: ["string", "string.quoted", "string.template", "punctuation.definition.string"], settings: { foreground: c.string } },
    { scope: ["constant.numeric", "constant.language", "support.constant"], settings: { foreground: c.num } },
    { scope: ["entity.name.function", "support.function", "meta.function-call", "variable.function"], settings: { foreground: c.fn } },
    { scope: ["entity.name.tag", "support.class.component", "entity.name.type", "support.type", "entity.name.class"], settings: { foreground: c.tag } },
    { scope: ["entity.other.attribute-name", "support.type.property-name", "meta.object-literal.key"], settings: { foreground: c.attr } },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: c.dim } },
  ],
});

export const codeThemes = {
  light: theme("site-light", "light", {
    fg: "#1d1d1f",
    dim: "#67676c",
    keyword: "#bd1f69",
    string: "#17743a",
    fn: "#6a3fc0",
    tag: "#0a5bbf",
    attr: "#8f5208",
    num: "#a84b0c",
  }),
  dark: theme("site-dark", "dark", {
    fg: "#e5e5ea",
    dim: "#8e8e93",
    keyword: "#ff7eb6",
    string: "#8fdfa4",
    fn: "#c4a7ff",
    tag: "#79c6ff",
    attr: "#f2c98a",
    num: "#ffb07a",
  }),
};
