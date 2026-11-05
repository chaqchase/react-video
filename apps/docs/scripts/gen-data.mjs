// Writes what the site shows about the package, read from the package itself: an API
// reference from its TypeScript source, and sizes from its build. Run `pnpm data`
// after changing either. `pnpm check` fails if what's committed has gone stale.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const docs = resolve(here, "..");
const core = resolve(docs, "../../packages/core");
const requireCore = createRequire(join(core, "package.json"));
const ts = requireCore("typescript");
const manifest = JSON.parse(readFileSync(join(core, "package.json"), "utf8"));

const toSource = (path) =>
  join(core, path.replace(/^\.\/dist\//, "src/").replace(/\.js$/, ".ts"));
const resolveSource = (path) => {
  const candidate = toSource(path);
  for (const file of [candidate, candidate.replace(/\.ts$/, ".tsx")]) {
    try {
      readFileSync(file);
      return file;
    } catch {
      // Try the next extension.
    }
  }
  throw new Error(`No source for ${path}`);
};

const entries = Object.entries(manifest.exports)
  .filter(([, target]) => typeof target === "object" && target.default?.endsWith(".js"))
  .map(([subpath, target]) => ({
    name: subpath === "." ? manifest.name : `${manifest.name}/${subpath.slice(2)}`,
    file: resolveSource(target.default),
  }));

function generateApi() {
  const config = ts.getParsedCommandLineOfConfigFile(join(core, "tsconfig.json"), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    },
  });
  const program = ts.createProgram(
    entries.map(({ file }) => file),
    { ...config.options, noEmit: true }
  );
  const checker = program.getTypeChecker();
  const FLAGS =
    ts.TypeFormatFlags.NoTruncation |
    ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
    ts.TypeFormatFlags.WriteArrowStyleSignature;

  const typeText = (type, node) =>
    checker.typeToString(type, node, FLAGS).replace(/import\("[^"]*"\)\./g, "");
  const docOf = (symbol) =>
    ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\s+/g, " ").trim();
  const isOwn = (symbol) =>
    (symbol.declarations ?? []).some((node) =>
      node.getSourceFile().fileName.startsWith(join(core, "src"))
    );

  const membersOf = (type, node) =>
    checker
      .getPropertiesOfType(type)
      .filter(isOwn)
      .map((property) => {
        const declaration = property.valueDeclaration ?? property.declarations?.[0] ?? node;
        const memberType = checker.getTypeOfSymbolAtLocation(property, declaration);
        const signature = memberType.getCallSignatures()[0];
        return {
          name: property.name,
          type: signature
            ? checker.signatureToString(signature, declaration, FLAGS).replace(/import\("[^"]*"\)\./g, "")
            : typeText(memberType, declaration),
          optional: Boolean(property.flags & ts.SymbolFlags.Optional),
          doc: docOf(property),
        };
      });

  const symbols = {};
  const byEntry = {};

  for (const { name: entry, file } of entries) {
    const source = program.getSourceFile(file);
    const entrySymbol = source && checker.getSymbolAtLocation(source);
    if (!entrySymbol) throw new Error(`Can't read ${file}`);
    byEntry[entry] = [];

    for (const exported of checker.getExportsOfModule(entrySymbol)) {
      const symbol =
        exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const node = symbol.valueDeclaration ?? symbol.declarations?.[0];
      if (!node) continue;
      const name = exported.name;
      byEntry[entry].push(name);
      const id = `${entry}#${name}`;

      if (symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias) && !symbol.valueDeclaration) {
        const type = checker.getDeclaredTypeOfSymbol(symbol);
        const members = type.isUnion() ? [] : membersOf(type, node);
        symbols[id] = {
          entry,
          name,
          kind: "type",
          doc: docOf(symbol),
          members,
          ...(members.length === 0 && { definition: typeText(type, node) }),
        };
        continue;
      }

      const type = checker.getTypeOfSymbolAtLocation(symbol, node);
      const [call] = type.getCallSignatures();
      const pluginName = type.getProperty("pluginName");
      const base = { entry, name, doc: docOf(symbol) };

      if (pluginName && call) {
        const instance = call.getReturnType();
        const [, stateType, commandsType] = checker.getTypeArguments(
          instance.aliasTypeArguments ? { target: instance, typeArguments: instance.aliasTypeArguments } : instance
        );
        // Factories take `...options`, so this is a tuple of the plugin's own parameters.
        const [restSymbol] = call.getParameters();
        const tuple =
          restSymbol && checker.getTypeOfSymbolAtLocation(restSymbol, restSymbol.valueDeclaration ?? node);
        const [optionsType] = tuple ? checker.getTypeArguments(tuple) : [];
        const nonNull = optionsType && checker.getNonNullableType(optionsType);
        const isPlainOptions = nonNull && !nonNull.isUnion();
        symbols[id] = {
          ...base,
          kind: "plugin",
          pluginName: checker.typeToString(checker.getTypeOfSymbolAtLocation(pluginName, node)).replace(/"/g, ""),
          required: Boolean(tuple?.target?.minLength),
          optionsType: nonNull ? typeText(nonNull, node) : null,
          options: isPlainOptions ? membersOf(nonNull, node) : [],
          state: stateType ? membersOf(stateType, node) : [],
          commands: commandsType ? membersOf(commandsType, node) : [],
        };
        continue;
      }

      const isComponent = /^[A-Z]/.test(name) && (call || type.getProperty("$$typeof"));
      if (isComponent && call) {
        const [propsSymbol] = call.getParameters();
        const propsType =
          propsSymbol && checker.getTypeOfSymbolAtLocation(propsSymbol, propsSymbol.valueDeclaration ?? node);
        symbols[id] = { ...base, kind: "component", props: propsType ? membersOf(propsType, node) : [] };
        continue;
      }
      if (call) {
        symbols[id] = {
          ...base,
          kind: name.startsWith("use") ? "hook" : "function",
          signature: typeText(type, node),
        };
        continue;
      }
      symbols[id] = { ...base, kind: "value", signature: typeText(type, node) };
    }
    byEntry[entry].sort();
  }

  return { entries: byEntry, symbols };
}

async function generateSizes() {
  const output = execFileSync(join(core, "node_modules/.bin/size-limit"), ["--json"], {
    cwd: core,
    encoding: "utf8",
  });
  const figures = JSON.parse(output.slice(output.indexOf("[")));
  const standalone = Object.fromEntries(figures.map(({ name, size }) => [name, size]));

  // What a plugin adds to the player layout, which already has what plugins share.
  const { build } = requireCore("esbuild");
  const bundle = async (contents) => {
    const result = await build({
      stdin: { contents, resolveDir: core, loader: "js" },
      bundle: true,
      minify: true,
      write: false,
      format: "esm",
      treeShaking: true,
      external: ["react", "react-dom", "react/jsx-runtime", "hls.js", "dashjs", "*.css"],
      logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' },
    });
    const text = result.outputFiles.map(({ text: chunk }) => chunk).join("");
    return brotliCompressSync(Buffer.from(text)).length;
  };
  const player = "export { VideoPlayer } from './dist/player/index.js';";
  const base = await bundle(player);
  const marginal = {};
  for (const { name, path } of (await import(join(core, ".size-limit.mjs"))).default) {
    if (!/^dist\/(plugins|compat)\//.test(path)) continue;
    const added = await bundle(`${player}\nexport * as added from './${path}';`);
    marginal[name] = Math.max(added - base, 0);
  }
  const minimal = await bundle(
    "export { Root, Media, Slot, BufferingIndicator, PlayOverlay, ErrorOverlay, Controls, Timeline, ControlRow, ControlGroup, PlayPause, Time, SettingsMenu } from './dist/ui/index.js';"
  );
  // Scaled onto size-limit's figure, so the two bundlers' differences don't show.
  const layout = standalone["player layout, no plugins"];
  return { standalone, marginal, layouts: { minimal: layout + minimal - base } };
}

function generateTokens() {
  const css = readFileSync(join(core, "src/ui/styles/index.css"), "utf8");
  const block = css.slice(css.indexOf(".rv-root {"), css.indexOf("position:", css.indexOf(".rv-root {")));
  return [...block.matchAll(/(--rv-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => ({
    name,
    value: value.replace(/\s+/g, " ").trim(),
  }));
}

const check = process.argv.includes("--check");
const stale = [];

const write = (name, value) => {
  const path = join(docs, "lib/generated", name);
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (!check) writeFileSync(path, text);
  else if (readFileSync(path, "utf8") !== text) stale.push(name);
};

const only = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
if (only !== "sizes") {
  write("api.json", generateApi());
  write("tokens.json", generateTokens());
}
if (only !== "api") write("sizes.json", await generateSizes());
if (stale.length > 0) {
  console.error(`Stale site data: ${stale.join(", ")}. Run \`pnpm --filter docs data\` and commit the result.`);
  process.exit(1);
}
console.log(check ? "site data is current" : "site data written");
