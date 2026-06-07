import { createClient } from "@/lib/supabase/server";

type Body = {
  scheduledAt?: string;
  participantIds?: string[];
};

export async function POST(
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
  const scheduledAt = body.scheduledAt;
  if (typeof scheduledAt !== "string" || Number.isNaN(Date.parse(scheduledAt))) {
    return Response.json({ error: "Date invalide" }, { status: 400 });
  }

  const participantIds = Array.isArray(body.participantIds)
    ? body.participantIds.filter((id): id is string => typeof id === "string")
    : [];

  const { data, error } = await supabase.rpc("create_film_screening", {
    p_group_film_id: groupFilmId,
    p_scheduled_at: new Date(scheduledAt).toISOString(),
    p_participant_ids: participantIds,
  });

  if (error) {
    if (error.code === "P0001") {
      return Response.json({ error: "Film introuvable" }, { status: 404 });
    }
    if (error.code === "42501") {
      return Response.json({ error: "Non autorisé" }, { status: 403 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ id: data }, { status: 201 });
}
