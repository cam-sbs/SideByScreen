"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 1_048_576; // 1 MiB

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) {
    return { error: "Le nom d'affichage est obligatoire." };
  }
  if (name.length > 50) {
    return { error: "Le nom ne doit pas dépasser 50 caractères." };
  }

  const avatarFile = formData.get("avatar") as File | null;
  const updates: { name: string; avatar_url?: string } = { name };

  if (avatarFile && avatarFile.size > 0) {
    if (!ALLOWED_MIME.includes(avatarFile.type)) {
      return { error: "Format d'image non supporté (JPG, PNG ou WEBP)." };
    }
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { error: "L'image dépasse la taille maximale (1 Mo)." };
    }

    const ext =
      avatarFile.type === "image/png"
        ? "png"
        : avatarFile.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, {
        contentType: avatarFile.type,
        upsert: true,
      });

    if (uploadError) {
      return { error: `Impossible d'uploader l'avatar : ${uploadError.message}` };
    }

    const { data: publicUrl } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    updates.avatar_url = publicUrl.publicUrl;
  }

  const { error: updateError } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id);

  if (updateError) {
    return { error: `Impossible d'enregistrer le profil : ${updateError.message}` };
  }

  revalidatePath("/profile");
  return { success: true };
}
