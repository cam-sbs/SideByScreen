export function mapGroupRpcError(message: string): string {
  if (message.includes("INVITE_CODE_NOT_FOUND")) {
    return "Ce lien n'est plus valide.";
  }
  if (message.includes("INVITE_CODE_REQUIRED")) {
    return "Le code d'invitation est obligatoire.";
  }
  if (message.includes("GROUP_NAME_REQUIRED")) {
    return "Le nom du groupe est obligatoire.";
  }
  if (message.includes("GROUP_NAME_TOO_LONG")) {
    return "Le nom du groupe ne doit pas dépasser 50 caractères.";
  }
  if (message.includes("ALREADY_IN_GROUP")) {
    return "Vous êtes déjà dans un groupe.";
  }
  if (message.includes("UNAUTHENTICATED")) {
    return "Session expirée. Veuillez vous reconnecter.";
  }
  return `Une erreur est survenue : ${message}`;
}

export function groupRpcErrorStatus(message: string): number {
  if (message.includes("UNAUTHENTICATED")) return 401;
  if (message.includes("ALREADY_IN_GROUP")) return 409;
  if (message.includes("INVITE_CODE_NOT_FOUND")) return 404;
  if (
    message.includes("GROUP_NAME_REQUIRED") ||
    message.includes("GROUP_NAME_TOO_LONG") ||
    message.includes("INVITE_CODE_REQUIRED")
  ) {
    return 400;
  }
  return 500;
}
