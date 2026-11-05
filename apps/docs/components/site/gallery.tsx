"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PLUGINS, type PluginDefinition, type PluginGroup } from "@/lib/catalog";
import { kb, LAYOUT, marginal } from "@/lib/sizes";
import { AnimatedNumber } from "./animated-number";
import { ArrowIcon, CheckIcon, SearchIcon } from "./icons";
import { Segmented } from "./segmented";

const GROUPS: PluginGroup[] = ["Controls", "Menus", "Timeline", "Streaming", "Viewing", "Revenue and rights", "Casting"];
type Filter = "All" | PluginGroup;
const FILTERS = (["All", ...GROUPS] as Filter[]).map((value) => ({ value, label: value }));

const addedBy = ({ id }: PluginDefinition) => (marginal[id] ?? 0) + (id === "ads" ? (marginal["ads/vast"] ?? 0) : 0);
const formatKb = (bytes: number) => `${(bytes / 1000).toFixed(1)} KB`;

function Card({ plugin, selected, onToggle }: { plugin: PluginDefinition; selected: boolean; onToggle(): void }) {
  const added = addedBy(plugin);
  return (
    <li
      className={`group bg-raised relative flex min-w-0 flex-col rounded-2xl border p-4 transition-[border-color,box-shadow,transform] duration-200 ease-rv ${
        selected ? "border-sun shadow-[0_0_0_1px_var(--site-sun)]" : "border-line hover:border-line-strong"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15.5px] font-semibold tracking-[-0.015em]">
          <Link href={`/docs/v4/plugins/${plugin.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
            {plugin.title}
          </Link>
        </h3>
        <button
          type="button"
          aria-pressed={selected}
          aria-label={`Add ${plugin.title} to your player`}
          onClick={onToggle}
          className={`press relative z-10 grid size-6 shrink-0 place-items-center rounded-full border ${
            selected ? "bg-sun border-sun text-[var(--site-on-sun)]" : "border-line-strong text-faint hover:text-text"
          }`}
        >
          <CheckIcon
            width={13}
            height={13}
            strokeWidth={2.2}
            className={`transition duration-200 ease-rv ${selected ? "" : "scale-75 opacity-0 group-hover:opacity-50"}`}
          />
        </button>
      </div>
      <p className="text-dim mt-1 flex-1 text-[13.5px] leading-snug">{plugin.blurb}</p>
      <div className="mt-4 flex items-center justify-between gap-2 font-mono text-[12px]">
        <code className="text-faint truncate">/{plugin.entry}</code>
        <span className={`shrink-0 tabular-nums ${selected ? "text-sun" : "text-dim"}`}>
          +{added < 1000 ? `${added} B` : kb(added)}
        </span>
      </div>
    </li>
  );
}

export function Gallery() {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PLUGINS.filter(
      (plugin) =>
        (filter === "All" || plugin.group === filter) &&
        (!needle || `${plugin.title} ${plugin.blurb} ${plugin.id}`.toLowerCase().includes(needle))
    );
  }, [filter, query]);

  const total = useMemo(
    () => PLUGINS.filter(({ id }) => selected.includes(id)).reduce((sum, plugin) => sum + addedBy(plugin), LAYOUT),
    [selected]
  );

  return (
    <>
      <div className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-full overflow-x-auto">
          <Segmented label="Filter by group" options={FILTERS} value={filter} size="sm" onChange={(next) => setFilter(next)} />
        </div>
        <label className="border-line bg-raised focus-within:border-sun flex h-9 items-center gap-2 rounded-[11px] border px-3 transition-colors duration-150 lg:w-[240px]">
          <SearchIcon className="text-faint shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search plugins"
            aria-label="Search plugins"
            className="placeholder:text-faint min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="text-dim mt-16 text-center text-[15px]">Nothing matches &ldquo;{query}&rdquo;.</p>
      ) : (
        GROUPS.filter((group) => visible.some((plugin) => plugin.group === group)).map((group) => (
          <section key={group} className="mt-10">
            <h2 className="text-dim mb-3 font-mono text-[12.5px]">{group}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible
                .filter((plugin) => plugin.group === group)
                .map((plugin) => (
                  <Card
                    key={plugin.id}
                    plugin={plugin}
                    selected={selected.includes(plugin.id)}
                    onToggle={() =>
                      setSelected((current) =>
                        current.includes(plugin.id)
                          ? current.filter((id) => id !== plugin.id)
                          : [...current, plugin.id]
                      )
                    }
                  />
                ))}
            </ul>
          </section>
        ))
      )}

      <div
        data-open={selected.length > 0 || undefined}
        aria-hidden={selected.length === 0}
        className="selection-bar fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 mx-auto w-[min(560px,calc(100vw-32px))]"
      >
        <div className="page-timeline-glass flex items-center justify-between gap-3 rounded-full py-2 pr-2 pl-5 text-white">
          <p className="min-w-0 truncate text-[13.5px]" aria-live="polite">
            <span className="text-white/70">
              {selected.length} {selected.length === 1 ? "plugin" : "plugins"}, about{" "}
            </span>
            <AnimatedNumber value={total} format={formatKb} className="font-mono font-medium tabular-nums" />
          </p>
          <Link
            href={`/playground?p=${selected.join(",")}`}
            tabIndex={selected.length === 0 ? -1 : undefined}
            className="press group btn h-9 rounded-full bg-white px-4 text-[13.5px] text-[#17132b]"
          >
            Try them
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </>
  );
}
