import Link from "next/link";
import { Eyebrow, SectionLead, SectionTitle } from "@/components/site/eyebrow";
import { ChevronIcon } from "@/components/site/icons";
import { COMPLETE, KERNEL, kb, LAYOUT, marginal, STYLES } from "@/lib/sizes";

const SKIP = new Set(["ads/vast", "ads/ima", "compat"]);

export function Sizes() {
  const rows = Object.entries(marginal)
    .filter(([name]) => !SKIP.has(name))
    .sort(([, a], [, b]) => b - a);
  const largest = rows[0]?.[1] ?? 1;
  const headline = [
    { value: KERNEL, label: "Kernel", note: "Root and Media, the floor" },
    { value: LAYOUT, label: "Full layout", note: "Every control, no plugins" },
    { value: COMPLETE, label: "With defaults", note: "defaultPlugins() included" },
    { value: STYLES, label: "Skin", note: "One optional CSS file" },
  ];

  return (
    <section id="size" className="site-section">
      <div className="site-wrap">
        <div className="reveal">
          <Eyebrow>Size</Eyebrow>
          <SectionTitle>Every byte, accounted for.</SectionTitle>
          <SectionLead>
            Every figure here comes from the package&apos;s own build, in brotli, without React. Each entry has a budget, and
            going over fails the check. Plugins you don&apos;t import add nothing.
          </SectionLead>
        </div>
        <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {headline.map(({ value, label, note }) => (
            <div key={label}>
              <dt className="text-[15px] font-semibold tracking-[-0.016em]">{label}</dt>
              <dd className="site-numeral mt-2 text-[clamp(2.5rem,5.4vw,4rem)]">{kb(value)}</dd>
              <dd className="text-dim mt-2 text-[14px]">{note}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-16 mb-4 text-[21px] font-semibold tracking-[-0.018em]">What each plugin adds to a player</h3>
        <ul className="grid gap-x-12 gap-y-0.5 md:grid-cols-2">
          {rows.map(([name, bytes]) => (
            <li key={name}>
              <Link
                href={`/docs/v4/plugins/${name}`}
                className="group hover:bg-hover -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors duration-150"
              >
                <span className="w-[112px] shrink-0 truncate text-[14px]">{name}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--site-switch-off)]">
                  <span
                    className="size-bar group-hover:bg-sun block h-full origin-left rounded-full bg-[var(--site-dim)] transition-colors duration-150"
                    style={{ width: `${(bytes / largest) * 100}%` }}
                  />
                </span>
                <span className="text-dim w-[60px] shrink-0 text-right text-[13px] tabular-nums">
                  {bytes < 1000 ? `${bytes} B` : kb(bytes)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/plugins" className="more mt-8">
          Browse every plugin
          <ChevronIcon />
        </Link>
      </div>
    </section>
  );
}
