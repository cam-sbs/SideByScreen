import { createClient } from "@/lib/supabase/server";
import { computeScreenStatus } from "@/lib/screenStatus";

type Action = "move_to_salon" | "restore_to_cinema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id: groupFilmId } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const action = (payload as { action?: unknown })?.action as Action | undefined;
  if (action !== "move_to_salon" && action !== "restore_to_cinema") {
    return Response.json({ error: "Action invalide" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("group_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.group_id) {
    return Response.json({ error: "Aucun groupe" }, { status: 404 });
  }

  // Verify the film belongs to the user's group
  const { data: film } = await supabase
    .from("group_films")
    .select("id, theatrical_release_date, screen_status, salon_override, group_id")
    .eq("id", groupFilmId)
    .eq("group_id", profile.group_id)
    .maybeSingle();

  if (!film) {
    return Response.json({ error: "Film introuvable" }, { status: 404 });
  }

  if (action === "move_to_salon") {
    const { error } = await supabase
      .from("group_films")
      .update({
        salon_override: true,
        screen_status: "salon",
        transitioned_to_salon_at: new Date().toISOString(),
      })
      .eq("id", groupFilmId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Notify all group members
    const { data: members } = await supabase
      .from("users")
      .select("id")
      .eq("group_id", profile.group_id)
      .neq("id", user.id);

    if (members && members.length > 0) {
      await supabase.from("notifications").insert(
        members.map((m) => ({
          user_id: m.id as string,
          type: "film_moved_to_salon" as const,
          group_film_id: groupFilmId,
          triggered_by_user_id: user.id,
        })),
      );
    }
  } else {
    // restore_to_cinema: clear override, recompute status
    const theatricalReleaseDate = film.theatrical_release_date as string | null;
    const newStatus = computeScreenStatus(theatricalReleaseDate);

    const { error } = await supabase
      .from("group_films")
      .update({
        salon_override: false,
        screen_status: newStatus,
        transitioned_to_salon_at: null,
      })
      .eq("id", groupFilmId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}
