import { createClient } from "@/lib/supabase/server";

type Body = {
  accept?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: screeningId } = await params;

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
  if (typeof body.accept !== "boolean") {
    return Response.json({ error: "accept manquant" }, { status: 400 });
  }

  const { error } = await supabase.rpc("respond_to_screening", {
    p_screening_id: screeningId,
    p_accept: body.accept,
  });

  if (error) {
    if (error.code === "P0001") {
      return Response.json({ error: "Séance introuvable" }, { status: 404 });
    }
    if (error.code === "42501") {
      return Response.json({ error: "Non autorisé" }, { status: 403 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
