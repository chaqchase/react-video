/** Sections are chapters, so each one opens with its timecode. */
export function Eyebrow({ time, children }: { time: string; children: React.ReactNode }) {
  return (
    <p className="mb-5 flex items-center gap-3 font-mono text-[12.5px] tracking-tight">
      <span className="text-sun">{time}</span>
      <span className="text-dim">{children}</span>
      <span className="eyebrow-rule" aria-hidden="true" />
    </p>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="max-w-[20ch] text-[clamp(1.9rem,4.4vw,3.25rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-balance">
      {children}
    </h2>
  );
}

export function SectionLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-dim mt-4 max-w-[56ch] text-[clamp(1rem,1.4vw,1.125rem)] leading-relaxed text-pretty">
      {children}
    </p>
  );
}
