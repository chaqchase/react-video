"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { search, type SearchEntry } from "@/lib/docs/search";
import { SearchIcon } from "./icons";

const subscribe = () => () => {};
const isApple = () => /Mac|iPhone|iPad/.test(navigator.platform);

let index: Promise<SearchEntry[]> | undefined;
/** Fetched on the first query and kept, so later ones rank without the network. A failed fetch tries again next time. */
const loadIndex = () =>
  (index ??= fetch("/search-index.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Search index: ${response.status}`);
      return response.json() as Promise<SearchEntry[]>;
    })
    .catch((error: unknown) => {
      index = undefined;
      throw error;
    }));

/** The docs in one box, on every page. It opens with the button, or with ⌘K from anywhere. */
export function Search() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; results: SearchEntry[] }>({ query: "", results: [] });
  const [active, setActive] = useState(0);
  const apple = useSyncExternalStore(subscribe, isApple, () => true);

  const trimmed = query.trim();
  const results = trimmed ? found.results : [];

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      if (dialog.current?.open) dialog.current.close();
      else dialog.current?.showModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!trimmed) return;
    let current = true;
    loadIndex()
      .then((entries) => {
        if (!current) return;
        setFound({ query: trimmed, results: search(entries, trimmed) });
        setActive(0);
      })
      .catch(() => {
        // The network dropped, and the old results still stand.
      });
    return () => {
      current = false;
    };
  }, [trimmed]);

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const open = (entry: SearchEntry | undefined) => {
    if (!entry) return;
    dialog.current?.close();
    router.push(entry.url);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") open(results[active]);
    else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length) setActive((active + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
    }
  };

  const shortcut = apple ? "⌘K" : "Ctrl K";

  return (
    <>
      {/* The name has to include what's written on the button, for anyone who asks for it by voice. */}
      <button
        type="button"
        aria-label={`Search ${shortcut}`}
        aria-keyshortcuts="Meta+K Control+K"
        className="site-search-button press"
        onClick={() => dialog.current?.showModal()}
      >
        <SearchIcon width={14} height={14} />
        <span className="site-search-label">Search</span>{" "}
        <kbd className="site-search-key">{shortcut}</kbd>
      </button>
      <dialog
        ref={dialog}
        aria-label="Search the docs"
        className="site-search"
        onClose={() => setQuery("")}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="site-search-field">
          <SearchIcon width={16} height={16} />
          <input
            type="text"
            role="combobox"
            aria-label="Search the docs"
            aria-expanded={results.length > 0}
            aria-controls={id}
            aria-activedescendant={results.length ? `${id}-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search the docs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <ul ref={list} id={id} role="listbox" aria-label="Results" className="site-search-results">
          {results.map((entry, index) => (
            <li
              key={entry.url}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === active}
              className="site-search-row"
              onClick={() => open(entry)}
              onPointerMove={() => setActive(index)}
            >
              <span className="site-search-title">
                {entry.heading ?? entry.page}
                {entry.url.startsWith("/docs/v3") ? <span className="site-search-tag">v3</span> : null}
              </span>
              <span className="site-search-text">{entry.heading ? entry.page : entry.text}</span>
            </li>
          ))}
        </ul>
        {trimmed && found.query === trimmed && results.length === 0 ? (
          <p className="site-search-empty">Nothing in the docs matches &ldquo;{trimmed}&rdquo;.</p>
        ) : null}
      </dialog>
    </>
  );
}
