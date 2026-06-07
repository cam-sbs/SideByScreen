import { createClient } from "@/lib/supabase/server";

type Body = {
  is_tagged?: boolean;
  is_seen?: boolean;
  is_wished?: boolean;
  watched_together?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupFilmId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const body = (payload ?? {}) as Body;
  const updates: {
    is_tagged?: boolean;
    is_seen?: boolean;
    is_wished?: boolean;
    seen_at?: string | null;
    watched_together_at?: string | null;
  } = {};

  if (typeof body.is_tagged === "boolean") {
    updates.is_tagged = body.is_tagged;
  }
  if (typeof body.is_seen === "boolean") {
    updates.is_seen = body.is_seen;
    updates.seen_at = body.is_seen ? new Date().toISOString() : null;
  }
  if (typeof body.is_wished === "boolean") {
    updates.is_wished = body.is_wished;
  }
  if (typeof body.watched_together === "boolean") {
    updates.watched_together_at = body.watched_together
      ? new Date().toISOString()
      : null;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Aucune modification" }, { status: 400 });
  }

  const { data: film, error: filmError } = await supabase
    .from("group_films")
    .select("id, screen_status")
    .eq("id", groupFilmId)
    .maybeSingle();

  if (filmError || !film) {
    return Response.json({ error: "Film introuvable" }, { status: 404 });
  }

  // watched_together is only valid for salon films
  if (
    typeof body.watched_together === "boolean" &&
    film.screen_status !== "salon"
  ) {
    return Response.json(
      { error: "Action réservée aux films disponibles à la maison" },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("user_film_tags")
    .select("is_tagged, is_seen, is_wished, seen_at, watched_together_at")
    .eq("user_id", user.id)
    .eq("group_film_id", groupFilmId)
    .maybeSingle();

  // watched_together requires the user to be tagged
  if (
    typeof body.watched_together === "boolean" &&
    !existing?.is_tagged
  ) {
    return Response.json(
      { error: "Vous devez être positionné sur ce film" },
      { status: 403 },
    );
  }

  const nextIsTagged = updates.is_tagged ?? existing?.is_tagged ?? false;
  const nextIsSeen = updates.is_seen ?? existing?.is_seen ?? false;
  const nextIsWished = updates.is_wished ?? existing?.is_wished ?? false;
  const nextSeenAt =
    updates.is_seen === undefined
      ? (existing?.seen_at ?? null)
      : (updates.seen_at ?? null);
  const nextWatchedTogetherAt =
    updates.watched_together_at === undefined
      ? (existing?.watched_together_at ?? null)
      : updates.watched_together_at;

  const { error } = await supabase.from("user_film_tags").upsert(
    {
      user_id: user.id,
      group_film_id: groupFilmId,
      is_tagged: nextIsTagged,
      is_seen: nextIsSeen,
      is_wished: nextIsWished,
      seen_at: nextSeenAt,
      watched_together_at: nextWatchedTogetherAt,
    },
    { onConflict: "user_id,group_film_id", ignoreDuplicates: false },
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const becameSeen =
    updates.is_seen === true && existing?.is_seen !== true;
  if (becameSeen) {
    const { error: notifyError } = await supabase.rpc("notify_film_seen", {
      p_group_film_id: groupFilmId,
    });
    if (notifyError) {
      console.error("[tag] notify_film_seen failed", notifyError);
    }
  }

  const becameTagged =
    updates.is_tagged === true && existing?.is_tagged !== true;
  if (becameTagged) {
    const { error: notifyError } = await supabase.rpc("notify_film_tagged", {
      p_group_film_id: groupFilmId,
    });
    if (notifyError) {
      console.error("[tag] notify_film_tagged failed", notifyError);
    }
  }

  const becameUntagged =
    updates.is_tagged === false && existing?.is_tagged === true;
  if (becameUntagged) {
    const { error: notifyError } = await supabase.rpc("notify_film_untagged", {
      p_group_film_id: groupFilmId,
    });
    if (notifyError) {
      console.error("[tag] notify_film_untagged failed", notifyError);
    }
  }

  const becameWatchedTogether =
    body.watched_together === true &&
    existing?.watched_together_at == null;
  if (becameWatchedTogether) {
    const { error: notifyError } = await supabase.rpc(
      "notify_watched_together",
      { p_group_film_id: groupFilmId },
    );
    if (notifyError) {
      console.error("[tag] notify_watched_together failed", notifyError);
    }
  }

  const { data: visibilityResult, error: recalcError } = await supabase.rpc(
    "recalculate_group_film_visibility",
    { p_group_film_id: groupFilmId },
  );
  if (recalcError) {
    console.error("[tag] recalculate_group_film_visibility failed", recalcError);
  }

  const wasArchived = visibilityResult === "just_archived";
  return Response.json({ ok: true, wasArchived });
}
