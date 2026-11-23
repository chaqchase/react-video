import api from "./generated/api.json";

export interface ApiMember {
  name: string;
  type: string;
  optional: boolean;
  doc: string;
}

export interface ApiSymbol {
  entry: string;
  name: string;
  kind: "plugin" | "component" | "hook" | "function" | "type" | "value";
  doc: string;
  pluginName?: string;
  required?: boolean;
  optionsType?: string | null;
  options?: ApiMember[];
  state?: ApiMember[];
  commands?: ApiMember[];
  props?: ApiMember[];
  members?: ApiMember[];
  signature?: string;
  definition?: string;
}

export const symbols = api.symbols as unknown as Record<string, ApiSymbol>;
export const entries = api.entries as Record<string, string[]>;

export const symbol = (entry: string, name: string) => symbols[`${entry}#${name}`];

export function pluginSymbol(entry: string) {
  return (entries[entry] ?? []).map((name) => symbol(entry, name)).find((item) => item?.kind === "plugin");
}
