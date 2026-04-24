"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/app/actions/profile";
import { AvatarCropper } from "./AvatarCropper";

const ACCEPTED = "image/jpeg,image/png,image/webp";

type Props = {
  email: string;
  initialName: string;
  initialAvatarUrl: string | null;
  redirectTo: string | null;
};

export function ProfileForm({
  email,
  initialName,
  initialAvatarUrl,
  redirectTo,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState(initialName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED.split(",").includes(file.type)) {
      setError("Format d'image non supporté (JPG, PNG ou WEBP).");
      return;
    }

    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    setCropSourceUrl(URL.createObjectURL(file));
  }

  function handleCropConfirm(blob: Blob) {
    setProcessedBlob(blob);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(blob));
    closeCropper();
  }

  function closeCropper() {
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    setCropSourceUrl(null);
  }

  function submit() {
    setError(null);
    setSuccess(false);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Le nom d'affichage est obligatoire.");
      return;
    }

    const formData = new FormData();
    formData.set("name", trimmed);
    if (processedBlob) {
      formData.set("avatar", processedBlob, "avatar.jpg");
    }

    startTransition(async () => {
      const result = await saveProfile(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setProcessedBlob(null);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  const initials = getInitials(name || email);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5"
      >
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        {success && !error && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
            Profil enregistré.
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-500 dark:text-zinc-400">
                {initials}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {previewUrl ? "Changer l'avatar" : "Ajouter un avatar"}
          </button>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
            Nom d&apos;affichage
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
            placeholder="Votre nom"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>

      {cropSourceUrl && (
        <AvatarCropper
          sourceUrl={cropSourceUrl}
          onCancel={closeCropper}
          onConfirm={handleCropConfirm}
        />
      )}
    </>
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
