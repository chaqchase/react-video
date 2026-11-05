import Link from "next/link";
import { Eyebrow, SectionLead, SectionTitle } from "@/components/site/eyebrow";
import { ArrowIcon } from "@/components/site/icons";
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
    <section id="size" className="border-line border-y bg-[color-mix(in_srgb,var(--site-sunken)_70%,transparent)]">
      <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
        <div className="reveal">
          <Eyebrow time="01:33">Size</Eyebrow>
          <SectionTitle>Budgets a build can fail on.</SectionTitle>
          <SectionLead>
            Every figure here comes from the package&apos;s own build, in brotli, without React. Each entry has a budget, and
            going over fails the check. Plugins you don&apos;t import add nothing.
          </SectionLead>
        </div>
        <dl className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {headline.map(({ value, label, note }) => (
            <div key={label} className="border-line bg-raised rounded-2xl border p-5">
              <dt className="text-dim text-[13px]">{label}</dt>
              <dd className="mt-1 font-mono text-[clamp(1.5rem,3vw,2.1rem)] leading-tight font-medium tracking-tight">
                {kb(value)}
              </dd>
              <dd className="text-faint mt-1 text-[12.5px]">{note}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-12 mb-4 text-[15px] font-medium">What each plugin adds to a player</h3>
        <ul className="grid gap-x-10 gap-y-0.5 md:grid-cols-2">
          {rows.map(([name, bytes]) => (
            <li key={name}>
              <Link
                href={`/docs/v4/plugins/${name}`}
                className="group hover:bg-line -mx-2 flex items-center gap-3 rounded-lg px-2 py-[7px] transition-colors duration-150"
              >
                <span className="w-[108px] shrink-0 truncate font-mono text-[12.5px]">{name}</span>
                <span className="bg-line h-1.5 flex-1 overflow-hidden rounded-full">
                  <span
                    className="size-bar bg-sun block h-full origin-left rounded-full opacity-80 transition-opacity duration-150 group-hover:opacity-100"
                    style={{ width: `${(bytes / largest) * 100}%` }}
                  />
                </span>
                <span className="text-dim w-[56px] shrink-0 text-right font-mono text-[12px] tabular-nums">
                  {bytes < 1000 ? `${bytes} B` : kb(bytes)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/plugins" className="text-sun group mt-8 inline-flex items-center gap-1.5 text-[14px] font-medium">
          Browse every plugin
          <span className="transition-transform duration-200 ease-rv group-hover:translate-x-0.5">
            <ArrowIcon />
          </span>
        </Link>
      </div>
    </section>
  );
}
