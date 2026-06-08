"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { NotificationItem } from "./api/notifications/route";

async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch("/api/notifications", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Impossible de charger les notifications");
  }
  const payload = (await res.json()) as { notifications: NotificationItem[] };
  return payload.notifications;
}

export function NotificationCenter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isPending } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: 30_000,
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;

    const channelPromise = supabase.auth.getUser().then(({ data: userData }) => {
      userId = userData.user?.id ?? null;
      if (!userId) return null;
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            const newRecord = (payload as { new?: { type?: string } }).new;
            if (
              newRecord?.type === "film_archived" ||
              newRecord?.type === "film_watched_together"
            ) {
              queryClient.invalidateQueries({ queryKey: ["group-films"] });
            }
          },
        )
        .subscribe();
      return channel;
    });

    return () => {
      channelPromise.then((channel) => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [queryClient]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Échec de la mise à jour");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<NotificationItem[]>([
        "notifications",
      ]);
      queryClient.setQueryData<NotificationItem[]>(["notifications"], (old) =>
        (old ?? []).map((n) =>
          n.id === id && !n.readAt
            ? { ...n, readAt: new Date().toISOString() }
            : n,
        ),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["notifications"], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Échec de la mise à jour");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<NotificationItem[]>([
        "notifications",
      ]);
      const now = new Date().toISOString();
      queryClient.setQueryData<NotificationItem[]>(["notifications"], (old) =>
        (old ?? []).map((n) => (n.readAt ? n : { ...n, readAt: now })),
      );
      return { previous };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["notifications"], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  function handleClick(n: NotificationItem) {
    if (!n.readAt) markOne.mutate(n.id);
    setOpen(false);
    if (n.film) {
      router.push(`/film/${n.film.tmdbId}`);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} non lues)`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-dust hover:text-fog transition-colors"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-urgent px-1 text-[10px] font-bold text-white ring-2 ring-ink"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-2 top-16 z-50 max-h-[80vh] overflow-hidden rounded-xl border border-white/8 bg-ink-2 shadow-xl sm:absolute sm:inset-auto sm:right-0 sm:top-11 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
            <h2 className="text-sm font-semibold text-fog">Notifications</h2>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={unreadCount === 0 || markAll.isPending}
              className="text-xs text-dust underline disabled:opacity-40 hover:text-fog"
            >
              Tout marquer comme lu
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {isPending ? (
              <div className="p-4 text-center text-sm text-dust">
                Chargement…
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-dust">
                Aucune notification
              </div>
            ) : (
              <ul className="divide-y divide-white/6">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`flex w-full gap-3 px-3 py-3 text-left hover:bg-ink-3 transition-colors ${
                        n.readAt ? "" : "bg-sage-dim"
                      }`}
                    >
                      <Avatar
                        name={n.triggeredBy?.name ?? "?"}
                        avatarUrl={n.triggeredBy?.avatarUrl ?? null}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            n.readAt
                              ? "text-dust"
                              : "font-medium text-fog"
                          }`}
                        >
                          {formatMessage(n)}
                        </p>
                        <p className="mt-0.5 text-xs text-dust-2">
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>
                      {!n.readAt && (
                        <span
                          aria-hidden
                          className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-sage"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatMessage(n: NotificationItem): string {
  const who = n.triggeredBy?.name ?? "Quelqu'un";
  const title = n.film?.title ?? "un film";
  switch (n.type) {
    case "film_added":
      return `${who} a ajouté le film ${title}`;
    case "film_tagged":
      return `${who} est intéressé·e par ${title}`;
    case "film_untagged":
      return `${who} s'est désisté·e de ${title}`;
    case "film_seen":
      return `${who} a vu ${title}`;
    case "film_archived":
      return `« ${title} » a été archivé — le groupe l'a vu ou s'est désisté`;
    case "film_watched_together":
      return `${who} a confirmé avoir regardé « ${title} »`;
    case "screening_invited":
      return `${who} vous invite à une séance pour ${title}`;
    case "screening_cancelled":
      return `${who} ne viendra plus à la séance pour ${title}`;
    default:
      return `${who} – ${title}`;
  }
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "à l'instant";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "hier";
  if (diffD < 7) return `il y a ${diffD} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
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
    <span className="relative inline-flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-avatar-bg text-xs font-semibold text-avatar-text">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

function getInitials(source: string): string {
  const clean = source.trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}
