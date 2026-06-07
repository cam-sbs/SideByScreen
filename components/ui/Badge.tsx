import type { ReactNode } from "react";

type BadgeVariant = "sage" | "gold" | "urgent" | "warn" | "seen" | "muted";

const variantClasses: Record<BadgeVariant, string> = {
  sage:   "bg-sage-dim text-sage-light border border-sage-border",
  gold:   "bg-gold-dim text-gold border border-gold/20",
  urgent: "bg-urgent-dim text-urgent border border-urgent/20",
  warn:   "bg-warn-dim text-warn border border-warn/20",
  seen:   "bg-white/5 text-dust border border-white/8",
  muted:  "bg-white/4 text-dust-2 border border-white/7",
};

type BadgeProps = {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
};

export function Badge({ variant, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
