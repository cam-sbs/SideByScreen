type UrgencyDotProps = {
  color: "red" | "orange" | "none";
  title?: string;
};

export function UrgencyDot({ color, title }: UrgencyDotProps) {
  if (color === "none") return null;

  if (color === "red") {
    return (
      <span
        aria-label={title}
        title={title}
        className="block h-1.5 w-1.5 rounded-full bg-urgent"
        style={{ animation: "urgency-pulse 2s ease-in-out infinite" }}
      />
    );
  }

  return (
    <span
      aria-label={title}
      title={title}
      className="block h-1.5 w-1.5 rounded-full bg-warn"
    />
  );
}
