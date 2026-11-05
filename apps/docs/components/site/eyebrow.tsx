/** The small label over a section's headline. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-dim mb-3 text-[clamp(1rem,1.6vw,1.1875rem)] font-semibold tracking-[-0.016em]">{children}</p>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="site-title max-w-[24ch]">{children}</h2>;
}

export function SectionLead({ children }: { children: React.ReactNode }) {
  return <p className="site-lead mt-5 max-w-[34em]">{children}</p>;
}
