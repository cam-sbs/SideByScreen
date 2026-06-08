"use client";

import Link from "next/link";
import { NotificationCenter } from "@/app/NotificationCenter";
import { Avatar } from "@/components/ui/Avatar";

type HeaderProps = {
  userName: string;
  userAvatarUrl?: string | null;
};

export function Header({ userName, userAvatarUrl }: HeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-ink border-b border-white/6 px-4 py-3 flex items-center justify-between">
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-medium tracking-[0.2em] text-fog uppercase">
          SIDE ———————
        </span>
        <span className="text-[10px] font-medium tracking-[0.2em] text-fog uppercase">
          BY SCREEN
        </span>
      </div>

      <div className="flex items-center gap-3">
        <NotificationCenter />
        <Link href="/profile" aria-label="Mon profil">
          <Avatar name={userName} avatarUrl={userAvatarUrl} size="md" />
        </Link>
      </div>
    </header>
  );
}
