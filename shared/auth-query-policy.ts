/**
 * Política de resiliencia para la consulta pública de sesión.
 *
 * La primera carga puede coincidir con una reconexión breve del servidor de
 * desarrollo o con la recuperación de red del navegador. Reintentamos una vez
 * antes de considerar la consulta fallida, sin ocultar errores persistentes.
 */
export const AUTH_QUERY_RETRY_COUNT = 1;

/** Retardo exponencial acotado para el único reintento de auth.me. */
export function getAuthQueryRetryDelay(attemptIndex: number): number {
  const safeAttemptIndex = Math.max(0, attemptIndex);
  return Math.min(400 * 2 ** safeAttemptIndex, 1_500);
}
