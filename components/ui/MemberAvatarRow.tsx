import type { GroupFilmMember } from "@/app/api/group/films/route";
import { Avatar } from "./Avatar";

export type MemberInterest = {
  member: GroupFilmMember;
  isFavorite: boolean;
  isTagged: boolean;
};

type MemberAvatarRowProps = {
  interests: MemberInterest[];
  size?: "xs" | "sm";
};

export function MemberAvatarRow({ interests, size = "sm" }: MemberAvatarRowProps) {
  const visibleMembers = interests.filter((i) => i.isTagged);
  if (visibleMembers.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {visibleMembers.map(({ member, isFavorite }) => (
        <div
          key={member.id}
          className={[
            "inline-flex rounded-full",
            isFavorite ? "ring-2 ring-gold ring-offset-1 ring-offset-ink-2" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Avatar name={member.name} avatarUrl={member.avatarUrl} size={size} />
        </div>
      ))}
    </div>
  );
}
