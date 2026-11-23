import Link from "next/link";
import { entries, pluginSymbol, symbol, type ApiMember, type ApiSymbol } from "@/lib/api";
import { pluginById, PLUGINS, type PluginGroup } from "@/lib/catalog";
import { REPO } from "@/lib/site";
import { bytesLabel, marginal, standalone } from "@/lib/sizes";
import { CopyButton } from "@/components/site/copy-button";
import { ChevronIcon } from "@/components/site/icons";
import { DocText } from "./inline-code";
import { ScrollArea } from "./scroll-area";

const tidy = (type: string) => type.replace(/ \| undefined$/, "").replace(/\s+/g, " ");

function MemberTable({ members, nameLabel = "Name" }: { members: readonly ApiMember[]; nameLabel?: string }) {
  const described = members.some(({ doc }) => doc);
  return (
    <ScrollArea label={`${nameLabel}s`} className="my-4 overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-[13.5px] leading-[1.45]">
        <thead>
          <tr className="border-line-strong text-dim border-b text-[12.5px]">
            <th scope="col" className="w-[24%] py-2 pe-4 font-medium">{nameLabel}</th>
            <th scope="col" className="w-[30%] py-2 pe-4 font-medium">Type</th>
            {described ? <th scope="col" className="py-2 font-medium">Description</th> : null}
          </tr>
        </thead>
        <tbody>
          {members.map(({ name, type, optional, doc }) => (
            <tr key={name} className="border-line border-b">
              <td className="text-text py-2.5 pe-4 align-top font-mono text-[12.5px] whitespace-nowrap">
                {name}
                {optional ? <span className="text-dim">?</span> : null}
              </td>
              <td className="text-dim py-2.5 pe-4 align-top font-mono text-[12.5px] break-words">{tidy(type)}</td>
              {described ? (
                <td className="py-2.5 align-top text-[var(--doc-text)]">{doc ? <DocText>{doc}</DocText> : null}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-text mt-9 mb-1.5 text-[17px] font-semibold tracking-[-0.014em]">{children}</h3>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-dim mt-1 text-[14px] leading-[1.5]">{children}</p>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="text-text font-mono text-[13px]">{children}</code>;
}

/** The header for a plugin's page: how to import it, and what it costs. */
export function PluginSummary({ id }: { id: string }) {
  const plugin = pluginById(id);
  const entry = `react-video-kit/${plugin?.entry ?? id}`;
  const api = pluginSymbol(entry);
  if (!plugin || !api) throw new Error(`No plugin named ${id}`);
  const line = `import { ${api.name} } from "${entry}";`;
  const added = marginal[id];
  const alone = standalone[id];
  return (
    <div className="mb-7">
      <div className="doc-import">
        <code className="code-scroll font-mono text-[13px] whitespace-nowrap">{line}</code>
        <CopyButton text={line} label="Copy import" className="code-copy" />
      </div>
      <p className="text-dim mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] tabular-nums">
        {added === undefined ? null : <span>Adds {bytesLabel(added)} to a player</span>}
        {alone === undefined ? null : <span>{bytesLabel(alone)} on its own</span>}
        <a
          className="hover:text-text underline decoration-[var(--site-line-strong)] underline-offset-3 transition-colors duration-150"
          href={`${REPO}/tree/feat/v4/packages/core/src/plugins/${plugin.entry}`}
        >
          Source
        </a>
      </p>
    </div>
  );
}

/** Options, state, commands, and parts, read from the plugin's TypeScript types. */
export function PluginApi({ id }: { id: string }) {
  const plugin = pluginById(id);
  const entry = `react-video-kit/${plugin?.entry ?? id}`;
  const api = pluginSymbol(entry);
  if (!api) throw new Error(`No plugin named ${id}`);
  const parts = (entries[entry] ?? []).map((name) => symbol(entry, name)).filter((item): item is ApiSymbol => item?.kind === "component");
  return (
    <>
      <SubHeading>Options</SubHeading>
      {api.options?.length ? (
        <MemberTable members={api.options} nameLabel="Option" />
      ) : api.optionsType ? (
        <Note>
          Takes <Mono>{api.optionsType}</Mono>.
        </Note>
      ) : (
        <Note>This plugin takes no options.</Note>
      )}
      <SubHeading>State</SubHeading>
      {api.state?.length ? (
        <>
          <Note>
            Read it with <Mono>useVideoState({api.name}, (state) =&gt; …)</Mono>.
          </Note>
          <MemberTable members={api.state} nameLabel="Field" />
        </>
      ) : (
        <Note>This plugin has no state of its own.</Note>
      )}
      <SubHeading>Commands</SubHeading>
      {api.commands?.length ? (
        <>
          <Note>
            Call them with <Mono>useCommands({api.name})</Mono>.
          </Note>
          <MemberTable members={api.commands} nameLabel="Command" />
        </>
      ) : (
        <Note>This plugin has no commands of its own.</Note>
      )}
      {parts.length > 0 ? (
        <>
          <SubHeading>Parts</SubHeading>
          <ScrollArea label="Parts" className="my-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13.5px] leading-[1.45]">
              <thead>
                <tr className="border-line-strong text-dim border-b text-[12.5px]">
                  <th scope="col" className="w-[24%] py-2 pe-4 font-medium">Part</th>
                  <th scope="col" className="py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => (
                  <tr key={part.name} className="border-line border-b">
                    <td className="text-text py-2.5 pe-4 align-top font-mono text-[12.5px] whitespace-nowrap">{part.name}</td>
                    <td className="py-2.5 align-top text-[var(--doc-text)]">{part.doc ? <DocText>{part.doc}</DocText> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </>
      ) : null}
    </>
  );
}

/** A component's props, a hook's signature, or a type's fields, from the source. */
export function Api({ entry = "react-video-kit", name }: { entry?: string; name: string }) {
  const item = symbol(entry, name);
  if (!item) throw new Error(`${entry} doesn't export ${name}`);
  const members = item.props ?? item.members ?? [];
  return (
    <div className="my-5">
      {item.doc ? (
        <p className="mb-3 text-[14px] leading-[1.5] text-[var(--doc-text)]">
          <DocText>{item.doc}</DocText>
        </p>
      ) : null}
      {item.signature ? (
        <pre className="code-frame doc-signature">
          {item.signature}
        </pre>
      ) : null}
      {item.definition ? (
        <pre className="code-frame doc-signature">
          {item.definition}
        </pre>
      ) : null}
      {members.length > 0 ? <MemberTable members={members} nameLabel={item.props ? "Prop" : "Field"} /> : null}
    </div>
  );
}

const KIND_ORDER = ["component", "icon", "hook", "plugin", "function", "value", "type"] as const;
const KIND_TITLES = { component: "Components", icon: "Icons", hook: "Hooks", plugin: "Plugin", function: "Functions", value: "Values", type: "Types" };
const kindOf = (item: ApiSymbol) => (item.kind === "component" && item.name.endsWith("Icon") ? "icon" : item.kind);

/** All of an entry's exports, generated, so nothing can be left undocumented. */
export function ApiEntry({ entry }: { entry: string }) {
  const items = (entries[entry] ?? []).flatMap((name) => symbol(entry, name) ?? []);
  return (
    <>
      {KIND_ORDER.map((kind) => {
        const group = items.filter((item) => kindOf(item) === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind} className="mt-10">
            <h2 className="border-line-strong text-text border-b pb-2 text-[17px] font-semibold tracking-[-0.014em]">
              {KIND_TITLES[kind]}
            </h2>
            {group.map((item) => (
              <details key={item.name} className="doc-disclosure border-line group/api border-b">
                <summary className="hover:text-text flex cursor-pointer list-none items-center justify-between gap-3 py-2 font-mono text-[13px] text-[var(--doc-text)] transition-colors duration-150 group-open/api:text-[var(--site-text)] [&::-webkit-details-marker]:hidden">
                  {item.name}
                  <ChevronIcon width={11} height={11} className="text-dim shrink-0 transition-transform duration-200 ease-rv group-open/api:rotate-90" />
                </summary>
                <div className="pb-3">
                  {item.kind === "plugin" ? (
                    <p className="text-[14px] leading-[1.5] text-[var(--doc-text)]">
                      <DocText>{item.doc}</DocText>{" "}
                      <Link className="text-text underline decoration-[var(--site-line-strong)] underline-offset-3" href={`/docs/v4/plugins/${item.pluginName}`}>
                        Read the {item.pluginName} page.
                      </Link>
                    </p>
                  ) : (
                    <Api entry={entry} name={item.name} />
                  )}
                </div>
              </details>
            ))}
          </section>
        );
      })}
    </>
  );
}

const GROUPS: PluginGroup[] = ["Controls", "Menus", "Timeline", "Streaming", "Viewing", "Extras", "Revenue and rights", "Casting"];

/** Every plugin by group, with what it adds to a player. */
export function PluginList() {
  return (
    <div>
      {GROUPS.map((group) => (
        <section key={group} className="mt-9 first:mt-6">
          <h2 className="text-text mb-3 text-[17px] font-semibold tracking-[-0.014em]">{group}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PLUGINS.filter((plugin) => plugin.group === group).map((plugin) => (
              <li key={plugin.id} className="min-w-0">
                <Link
                  href={`/docs/v4/plugins/${plugin.id}`}
                  className="border-line hover:border-line-strong flex h-full items-start justify-between gap-3 rounded-[var(--doc-radius)] border-[0.5px] bg-[var(--doc-panel)] px-4 py-3 transition-colors duration-150"
                >
                  <span className="min-w-0">
                    <span className="text-text block text-[14px] font-medium tracking-[-0.008em]">{plugin.title}</span>
                    <span className="text-dim mt-0.5 block text-[13px] leading-snug">{plugin.blurb}</span>
                  </span>
                  <span className="text-dim shrink-0 text-[12.5px] tabular-nums">+{bytesLabel(marginal[plugin.id] ?? 0)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
