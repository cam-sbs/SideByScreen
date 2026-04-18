"use client";

import { useState } from "react";

type Props = {
  groupName: string;
  inviteCode: string;
  baseUrl: string;
};

export function GroupInviteCard({ groupName, inviteCode, baseUrl }: Props) {
  const [copiedField, setCopiedField] = useState<"code" | "link" | null>(null);

  const inviteLink = `${baseUrl.replace(/\/$/, "")}/invite/${inviteCode}`;

  async function copy(text: string, field: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 1500);
    } catch {
      setCopiedField(null);
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Rejoignez « ${groupName} » sur SideByScreen`,
          text: `Rejoignez le groupe « ${groupName} » avec le code ${inviteCode}.`,
          url: inviteLink,
        });
        return;
      } catch {
        // user cancelled or share failed — fall back to copy
      }
    }
    copy(inviteLink, "link");
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <header>
        <h2 className="text-sm font-semibold">Paramètres du groupe</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {groupName}
        </p>
      </header>

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Code d&apos;invitation
        </label>
        <div className="mt-1 flex gap-2">
          <input
            readOnly
            value={inviteCode}
            className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm tracking-widest dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => copy(inviteCode, "code")}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {copiedField === "code" ? "Copié" : "Copier"}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Lien d&apos;invitation
        </label>
        <div className="mt-1 flex gap-2">
          <input
            readOnly
            value={inviteLink}
            className="flex-1 truncate rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => copy(inviteLink, "link")}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {copiedField === "link" ? "Copié" : "Copier"}
          </button>
        </div>
        <button
          type="button"
          onClick={share}
          className="mt-2 w-full rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Partager l&apos;invitation
        </button>
      </div>
    </section>
  );
}
