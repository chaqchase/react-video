import Link from "next/link";
import { entries, pluginSymbol, symbol, type ApiMember, type ApiSymbol } from "@/lib/api";
import { pluginById, PLUGINS, type PluginGroup } from "@/lib/catalog";
import { REPO } from "@/lib/site";
import { bytesLabel, marginal, standalone } from "@/lib/sizes";
import { CopyButton } from "@/components/site/copy-button";
import { DocText } from "./inline-code";

const tidy = (type: string) => type.replace(/ \| undefined$/, "").replace(/\s+/g, " ");

function MemberTable({ members, nameLabel = "Name" }: { members: readonly ApiMember[]; nameLabel?: string }) {
  return (
    <div className="not-prose border-line my-4 overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[520px] border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="border-line text-dim border-b text-[12.5px]">
            <th scope="col" className="w-[26%] px-3.5 py-2 font-medium">{nameLabel}</th>
            <th scope="col" className="w-[34%] px-3.5 py-2 font-medium">Type</th>
            <th scope="col" className="px-3.5 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {members.map(({ name, type, optional, doc }) => (
            <tr key={name} className="hover:bg-sun-soft/40 transition-colors duration-150">
              <td className="px-3.5 py-2.5 align-top font-mono text-[12.5px] font-medium whitespace-nowrap">
                {name}
                {optional ? <span className="text-faint">?</span> : null}
              </td>
              <td className="text-dusk px-3.5 py-2.5 align-top font-mono text-[12px] leading-snug break-words">
                {tidy(type)}
              </td>
              <td className="text-dim px-3.5 py-2.5 align-top leading-snug">
                {doc ? <DocText>{doc}</DocText> : <span className="text-faint">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="not-prose mt-7 mb-1 text-[15px] font-semibold tracking-[-0.01em]">{children}</h3>;
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
    <div className="not-prose bg-raised border-line mb-7 overflow-hidden rounded-2xl border">
      <div className="border-line flex items-center justify-between gap-2 border-b py-1.5 pr-1.5 pl-4">
        <code className="truncate font-mono text-[13px]">{line}</code>
        <CopyButton text={line} label="Copy import" />
      </div>
      <dl className="divide-line grid grid-cols-2 divide-x text-[13px] sm:grid-cols-3">
        <div className="px-4 py-2.5">
          <dt className="text-dim text-[12px]">Adds to a player</dt>
          <dd className="text-sun mt-0.5 font-mono">{added === undefined ? "—" : bytesLabel(added)}</dd>
        </div>
        <div className="px-4 py-2.5">
          <dt className="text-dim text-[12px]">On its own</dt>
          <dd className="mt-0.5 font-mono">{alone === undefined ? "—" : bytesLabel(alone)}</dd>
        </div>
        <div className="col-span-2 px-4 py-2.5 max-sm:border-line max-sm:border-t sm:col-span-1">
          <dt className="text-dim text-[12px]">Source</dt>
          <dd className="mt-0.5">
            <a
              className="hover:text-sun font-mono transition-colors duration-150"
              href={`${REPO}/tree/feat/v4/packages/core/src/plugins/${plugin.entry}`}
            >
              plugins/{plugin.entry}
            </a>
          </dd>
        </div>
      </dl>
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
        <p className="not-prose text-dim mt-1 text-[14px]">
          Takes <code className="font-mono text-[13px]">{api.optionsType}</code>.
        </p>
      ) : (
        <p className="not-prose text-dim mt-1 text-[14px]">This plugin takes no options.</p>
      )}
      <SubHeading>State</SubHeading>
      {api.state?.length ? (
        <>
          <p className="not-prose text-dim mt-1 text-[14px]">
            Read it with <code className="font-mono text-[13px]">useVideoState({api.name}, (state) =&gt; …)</code>.
          </p>
          <MemberTable members={api.state} nameLabel="Field" />
        </>
      ) : (
        <p className="not-prose text-dim mt-1 text-[14px]">This plugin has no state of its own.</p>
      )}
      <SubHeading>Commands</SubHeading>
      {api.commands?.length ? (
        <>
          <p className="not-prose text-dim mt-1 text-[14px]">
            Call them with <code className="font-mono text-[13px]">useCommands({api.name})</code>.
          </p>
          <MemberTable members={api.commands} nameLabel="Command" />
        </>
      ) : (
        <p className="not-prose text-dim mt-1 text-[14px]">This plugin has no commands of its own.</p>
      )}
      {parts.length > 0 ? (
        <>
          <SubHeading>Parts</SubHeading>
          <ul className="not-prose my-3 flex flex-col gap-2 text-[14px]">
            {parts.map((part) => (
              <li key={part.name}>
                <code className="font-mono text-[13px] font-medium">{part.name}</code>
                {part.doc ? (
                  <span className="text-dim">
                    {" "}
                    — <DocText>{part.doc}</DocText>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
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
    <div className="not-prose my-5">
      {item.doc ? (
        <p className="text-dim mb-2 text-[14.5px] leading-relaxed">
          <DocText>{item.doc}</DocText>
        </p>
      ) : null}
      {item.signature ? (
        <pre className="bg-code border-line text-dusk overflow-x-auto rounded-xl border px-3.5 py-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
          {item.signature}
        </pre>
      ) : null}
      {item.definition ? (
        <pre className="bg-code border-line text-dusk overflow-x-auto rounded-xl border px-3.5 py-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
          {item.definition}
        </pre>
      ) : null}
      {members.length > 0 ? <MemberTable members={members} nameLabel={item.props ? "Prop" : "Field"} /> : null}
    </div>
  );
}

const KIND_ORDER = ["component", "hook", "plugin", "function", "value", "type"] as const;
const KIND_TITLES = { component: "Components", hook: "Hooks", plugin: "Plugin", function: "Functions", value: "Values", type: "Types" };

/** All of an entry's exports, generated, so nothing can be left undocumented. */
export function ApiEntry({ entry }: { entry: string }) {
  const items = (entries[entry] ?? []).flatMap((name) => symbol(entry, name) ?? []);
  return (
    <>
      {KIND_ORDER.map((kind) => {
        const group = items.filter((item) => item.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind}>
            <h2 className="not-prose text-dim mt-8 mb-2 font-mono text-[12.5px]">
              {KIND_TITLES[kind]}
            </h2>
            {group.map((item) => (
              <details key={item.name} className="not-prose border-line group/api border-b py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-mono text-[13.5px] font-medium">
                  {item.name}
                  <span aria-hidden="true" className="text-faint transition-transform duration-200 ease-rv group-open/api:rotate-90">›</span>
                </summary>
                {item.kind === "plugin" ? (
                  <p className="text-dim mt-2 text-[14px]">
                    <DocText>{item.doc}</DocText>{" "}
                    <Link className="text-sun" href={`/docs/v4/plugins/${item.pluginName}`}>
                      Read the {item.pluginName} page.
                    </Link>
                  </p>
                ) : (
                  <Api entry={entry} name={item.name} />
                )}
              </details>
            ))}
          </section>
        );
      })}
    </>
  );
}

const GROUPS: PluginGroup[] = ["Controls", "Menus", "Timeline", "Streaming", "Viewing", "Revenue and rights", "Casting"];

/** Every plugin by group, with what it adds to a player. */
export function PluginList() {
  return (
    <div className="not-prose">
      {GROUPS.map((group) => (
        <section key={group} className="mt-7 first:mt-2">
          <h2 className="text-dim mb-2 font-mono text-[12.5px]">{group}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PLUGINS.filter((plugin) => plugin.group === group).map((plugin) => (
              <li key={plugin.id}>
                <Link
                  href={`/docs/v4/plugins/${plugin.id}`}
                  className="group bg-raised border-line hover:border-line-strong flex h-full items-start justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-150"
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium">{plugin.title}</span>
                    <span className="text-dim mt-0.5 block text-[13px] leading-snug">{plugin.blurb}</span>
                  </span>
                  <span className="text-faint shrink-0 font-mono text-[12px] tabular-nums">
                    +{bytesLabel(marginal[plugin.id] ?? 0)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
