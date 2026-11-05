"use client";

interface SwitchProps {
  checked: boolean;
  onChange(checked: boolean): void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[28px] w-[46px] shrink-0 rounded-full transition-colors duration-200 ease-rv disabled:opacity-50 ${
        checked ? "bg-[var(--site-switch)]" : "bg-[var(--site-switch-off)]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-[2px] left-[2px] size-[24px] rounded-full bg-white shadow-[0_0_0_0.5px_rgb(0_0_0/0.04),0_3px_8px_rgb(0_0_0/0.2)] transition-transform duration-[260ms] ease-rv motion-reduce:transition-none ${
          checked ? "translate-x-[18px]" : ""
        }`}
      />
    </button>
  );
}
