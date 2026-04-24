import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groupRpcErrorStatus, mapGroupRpcError } from "@/lib/groups";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Session expirée. Veuillez vous reconnecter." },
      { status: 401 },
    );
  }

  let name: string;
  try {
    const body = (await request.json()) as { name?: unknown };
    name = typeof body?.name === "string" ? body.name.trim() : "";
  } catch {
    return Response.json(
      { error: "Corps de requête JSON invalide." },
      { status: 400 },
    );
  }

  if (!name) {
    return Response.json(
      { error: "Le nom du groupe est obligatoire." },
      { status: 400 },
    );
  }
  if (name.length > 50) {
    return Response.json(
      { error: "Le nom du groupe ne doit pas dépasser 50 caractères." },
      { status: 400 },
    );
  }

  const { data: groupId, error } = await supabase.rpc("create_and_join_group", {
    group_name: name,
  });

  if (error) {
    return Response.json(
      { error: mapGroupRpcError(error.message) },
      { status: groupRpcErrorStatus(error.message) },
    );
  }

  const { data: group, error: fetchError } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .eq("id", groupId)
    .single();

  if (fetchError || !group) {
    return Response.json(
      { error: "Groupe créé mais impossible de récupérer les détails." },
      { status: 500 },
    );
  }

  return Response.json(
    { id: group.id, name: group.name, inviteCode: group.invite_code },
    { status: 201 },
  );
}
