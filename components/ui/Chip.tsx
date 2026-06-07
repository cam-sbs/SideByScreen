import type { ReactNode } from "react";

type ChipProps = {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
};

export function Chip({ active = false, onClick, children, className = "" }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
        active
          ? "bg-sage-dim text-sage-light border border-sage-border"
          : "bg-ink-3 text-dust hover:bg-ink-4 hover:text-fog-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
