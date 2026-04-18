"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapGroupRpcError } from "@/lib/groups";

type ActionResult = { error: string } | { success: true };

export async function createGroup(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) {
    return { error: "Le nom du groupe est obligatoire." };
  }
  if (name.length > 50) {
    return { error: "Le nom du groupe ne doit pas dépasser 50 caractères." };
  }

  const { error } = await supabase.rpc("create_and_join_group", {
    group_name: name,
  });

  if (error) {
    return { error: mapGroupRpcError(error.message) };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function joinGroup(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  const raw = (formData.get("code") as string | null)?.trim() ?? "";
  if (!raw) {
    return { error: "Le code d'invitation est obligatoire." };
  }

  const code = extractInviteCode(raw);
  if (!code) {
    return { error: "Code d'invitation invalide." };
  }

  const { error } = await supabase.rpc("join_group_by_code", { code });

  if (error) {
    return { error: mapGroupRpcError(error.message) };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

function extractInviteCode(input: string): string | null {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    const param =
      url.searchParams.get("invite") ?? url.searchParams.get("code");
    if (param) {
      return normalize(param);
    }
  } catch {
    // not a URL, fall through
  }

  return normalize(trimmed);
}

function normalize(value: string): string | null {
  const clean = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.length >= 6 ? clean : null;
}

