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
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 ease-rv disabled:opacity-50 ${
        checked ? "bg-sun" : "bg-line-strong"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-[2px] left-[2px] size-[18px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.3)] transition-transform duration-[260ms] ease-rv motion-reduce:transition-none ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}
