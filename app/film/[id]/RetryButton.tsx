"use client";

import { useRouter } from "next/navigation";

export function RetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded-full border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:border-red-500 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-900"
    >
      Réessayer
    </button>
  );
}
