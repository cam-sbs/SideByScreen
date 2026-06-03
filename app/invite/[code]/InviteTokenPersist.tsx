"use client";

import { useEffect } from "react";

export const PENDING_GROUP_TOKEN_KEY = "pending_group_token";

export function InviteTokenPersist({ code }: { code: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(PENDING_GROUP_TOKEN_KEY, code);
    } catch {
      // localStorage indisponible (navigation privée, etc.)
    }
  }, [code]);

  return null;
}
