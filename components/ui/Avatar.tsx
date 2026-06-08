type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<AvatarSize, { cls: string; textCls: string }> = {
  xs: { cls: "h-5 w-5",   textCls: "text-[8px]"  },
  sm: { cls: "h-7 w-7",   textCls: "text-[10px]" },
  md: { cls: "h-10 w-10", textCls: "text-xs"     },
  lg: { cls: "h-12 w-12", textCls: "text-sm"     },
  xl: { cls: "h-16 w-16", textCls: "text-base"   },
};

type AvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: AvatarSize;
  bordered?: boolean;
  online?: boolean;
};

function getInitials(source: string): string {
  const clean = source.trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function Avatar({
  name,
  avatarUrl,
  size = "md",
  bordered = false,
  online = false,
}: AvatarProps) {
  const { cls, textCls } = sizeMap[size];
  const initials = getInitials(name);

  return (
    <span
      className={[
        "relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-avatar-bg text-avatar-text font-semibold",
        cls,
        textCls,
        bordered ? "border-2 border-ink" : "",
        online ? "ring-2 ring-sage ring-offset-2 ring-offset-ink" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={`Avatar de ${name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

type AvatarMember = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

type AvatarStackProps = {
  members: AvatarMember[];
  size?: AvatarSize;
  title?: string;
};

export function AvatarStack({ members, size = "sm", title }: AvatarStackProps) {
  const visible = members.slice(0, 3);
  const extra = members.length - visible.length;
  const { cls, textCls } = sizeMap[size];

  return (
    <div
      className="flex [&>*:not(:first-child)]:-ml-2"
      title={title ?? members.map((m) => m.name).join(", ")}
    >
      {visible.map((m) => (
        <Avatar key={m.id} name={m.name} avatarUrl={m.avatarUrl} size={size} bordered />
      ))}
      {extra > 0 && (
        <span
          className={`inline-flex flex-shrink-0 items-center justify-center rounded-full border-2 border-ink bg-avatar-bg text-avatar-text font-semibold ${cls} ${textCls}`}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
