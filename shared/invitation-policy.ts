export type InvitationRole = "user" | "admin";

/** Solo permite rutas internas durante el retorno del flujo OAuth. */
export function normalizeReturnPath(returnPath: string | null | undefined): string {
  return typeof returnPath === "string" && returnPath.startsWith("/") && !returnPath.startsWith("//")
    ? returnPath
    : "/";
}

/** Normaliza correos para compararlos sin diferencias de mayúsculas o espacios. */
export function normalizeInvitationEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

/** El enlace deja de ser válido exactamente al llegar a su fecha de expiración. */
export function isInvitationExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function isInvitationEmailAllowed(
  invitationEmail: string | null | undefined,
  userEmail: string | null | undefined,
): boolean {
  const expected = normalizeInvitationEmail(invitationEmail);
  if (!expected) return true;
  return expected === normalizeInvitationEmail(userEmail);
}
