"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Member = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type Props = {
  groupId: string;
  initialMembers: Member[];
  currentUserId: string;
};

export function GroupMembersList({
  groupId,
  initialMembers,
  currentUserId,
}: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const { data } = await supabase
        .from("users")
        .select("id, name, avatar_url")
        .eq("group_id", groupId)
        .order("name", { ascending: true });

      if (data) {
        setMembers(
          data.map((m) => ({
            id: m.id,
            name: m.name,
            avatarUrl: m.avatar_url,
          })),
        );
      }
    }

    const channel = supabase
      .channel(`group-members-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Membres</h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {members.length}
        </span>
      </header>

      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 py-2">
            <Avatar name={member.name} avatarUrl={member.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.name}</p>
            </div>
            {member.id === currentUserId && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Vous
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Avatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const initials = getInitials(name);
  return (
    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={`Avatar de ${name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {initials}
        </div>
      )}
    </div>
  );
}

function getInitials(source: string): string {
  const clean = source.trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
