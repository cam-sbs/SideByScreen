import type { ReactNode, InputHTMLAttributes } from "react";

type InputState = "default" | "error" | "success" | "disabled";

type InputProps = {
  label?: string;
  icon?: ReactNode;
  hint?: string;
  state?: InputState;
  searchPill?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "disabled">;

const stateClasses: Record<InputState, string> = {
  default:  "border-white/8 hover:border-white/13 focus:border-white/22",
  error:    "border-urgent/40 hover:border-urgent/50 focus:border-urgent/65",
  success:  "border-sage/38 hover:border-sage/45 focus:border-sage/60",
  disabled: "border-white/8 opacity-35 cursor-not-allowed",
};

const hintColors: Record<InputState, string> = {
  default:  "text-dust",
  error:    "text-urgent",
  success:  "text-sage-light",
  disabled: "text-dust",
};

export function Input({
  label,
  icon,
  hint,
  state = "default",
  searchPill = false,
  id,
  className = "",
  ...props
}: InputProps) {
  const isDisabled = state === "disabled";
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  const containerShape = searchPill ? "rounded-full" : "rounded-lg";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-fog-2">
          {label}
        </label>
      )}
      <div className={`relative flex items-center bg-ink-2 border ${stateClasses[state]} ${containerShape} transition-colors`}>
        {icon && (
          <span className="absolute left-4 text-dust pointer-events-none" aria-hidden>
            {icon}
          </span>
        )}
        <input
          id={inputId}
          disabled={isDisabled}
          className={`w-full bg-transparent px-4 py-4 text-md text-fog placeholder:text-dust-2 placeholder:font-light focus:outline-none ${icon ? "pl-10" : ""} ${containerShape}`}
          {...props}
        />
      </div>
      {hint && (
        <p className={`text-xs ${hintColors[state]}`}>{hint}</p>
      )}
    </div>
  );
}
