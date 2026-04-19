import { createClient } from "@/lib/supabase/server";

type Body = {
  is_tagged?: boolean;
  is_seen?: boolean;
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
    seen_at?: string | null;
  } = {};

  if (typeof body.is_tagged === "boolean") {
    updates.is_tagged = body.is_tagged;
  }
  if (typeof body.is_seen === "boolean") {
    updates.is_seen = body.is_seen;
    updates.seen_at = body.is_seen ? new Date().toISOString() : null;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Aucune modification" }, { status: 400 });
  }

  const { data: film, error: filmError } = await supabase
    .from("group_films")
    .select("id")
    .eq("id", groupFilmId)
    .maybeSingle();

  if (filmError || !film) {
    return Response.json({ error: "Film introuvable" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("user_film_tags")
    .select("is_tagged, is_seen, seen_at")
    .eq("user_id", user.id)
    .eq("group_film_id", groupFilmId)
    .maybeSingle();

  const nextIsTagged = updates.is_tagged ?? existing?.is_tagged ?? false;
  const nextIsSeen = updates.is_seen ?? existing?.is_seen ?? false;
  const nextSeenAt =
    updates.is_seen === undefined
      ? (existing?.seen_at ?? null)
      : (updates.seen_at ?? null);

  const { error } = await supabase.from("user_film_tags").upsert(
    {
      user_id: user.id,
      group_film_id: groupFilmId,
      is_tagged: nextIsTagged,
      is_seen: nextIsSeen,
      seen_at: nextSeenAt,
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

  const { error: recalcError } = await supabase.rpc(
    "recalculate_group_film_visibility",
    { p_group_film_id: groupFilmId },
  );
  if (recalcError) {
    console.error("[tag] recalculate_group_film_visibility failed", recalcError);
  }

  return Response.json({ ok: true });
}
