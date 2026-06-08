export function getReadableAuthError(error: string): string {
  if (error.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (error.includes("Email not confirmed")) return "Vérifiez votre boîte mail pour confirmer votre compte.";
  if (error.includes("already registered") || error.includes("User already registered")) return "Un compte existe déjà avec cet email.";
  if (error.includes("Password should be at least")) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (error.includes("rate limit") || error.includes("Too many requests")) return "Trop de tentatives — attendez quelques minutes.";
  if (error.includes("signup disabled") || error.includes("Signups not allowed")) return "Les inscriptions sont temporairement désactivées.";
  return "Quelque chose n'a pas fonctionné — réessayez dans un moment.";
}
