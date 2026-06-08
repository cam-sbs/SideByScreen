type SpinnerSize = "sm" | "md" | "lg";

const config: Record<SpinnerSize, { px: number; strokeWidth: number }> = {
  sm: { px: 16, strokeWidth: 12 },
  md: { px: 20, strokeWidth: 10 },
  lg: { px: 32, strokeWidth: 8 },
};

export function Spinner({ size = "md" }: { size?: SpinnerSize }) {
  const { px, strokeWidth } = config[size];
  return (
    <span className="inline-flex shrink-0" aria-hidden>
      <svg
        width={px}
        height={px}
        viewBox="0 0 100 100"
        fill="none"
        className="animate-spin"
        style={{ animationDuration: "0.75s", animationTimingFunction: "linear" }}
      >
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.2" />
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray="80 172"
          strokeDashoffset="60"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">Chargement en cours</span>
    </span>
  );
}
