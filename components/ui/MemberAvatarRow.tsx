import type { GroupFilmMember } from "@/app/api/group/films/route";
import { Avatar } from "./Avatar";

export type MemberInterest = {
  member: GroupFilmMember;
  isFavorite: boolean;
  isTagged: boolean;
};

type MemberAvatarRowProps = {
  interests: MemberInterest[];
};

export function MemberAvatarRow({ interests }: MemberAvatarRowProps) {
  const visibleMembers = interests.filter((i) => i.isTagged);
  if (visibleMembers.length === 0) return null;

  return (
    <div className="flex items-center">
      {visibleMembers.map(({ member, isFavorite }, i) => (
        <div
          key={member.id}
          className={[
            "inline-flex rounded-full shrink-0",
            isFavorite ? "ring-2 ring-gold ring-offset-1 ring-offset-ink-2" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ marginLeft: i > 0 ? "-22px" : "0", zIndex: visibleMembers.length - i }}
        >
          <Avatar name={member.name} avatarUrl={member.avatarUrl} size="lg" bordered />
        </div>
      ))}
    </div>
  );
}
