import type { ReactNode } from "react";

type ButtonVariant = "primary" | "fog" | "subtle" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-sage text-white hover:bg-sage-light hover:-translate-y-px",
  fog: "bg-fog text-ink hover:bg-white hover:-translate-y-px",
  subtle: "bg-ink-3 text-fog-2 hover:bg-ink-4",
  ghost:
    "border border-white/10 text-dust hover:border-white/20 hover:text-fog-2",
  danger:
    "bg-urgent-dim text-urgent border border-urgent/20 hover:bg-urgent/20",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "py-2 px-4 text-sm",
  md: "py-3 px-5 text-md",
  lg: "py-4 px-7 text-lg",
};

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconOnly?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconOnly = false,
  disabled = false,
  type = "button",
  onClick,
  children,
  className = "",
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none";

  const iconOnlyClass = iconOnly
    ? "h-[42px] w-[42px] p-0 bg-ink-3"
    : sizeClasses[size];

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variantClasses[variant]} ${iconOnlyClass} ${className}`}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {!iconOnly && children}
    </button>
  );
}
