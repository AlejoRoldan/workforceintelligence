/**
 * Audit Service — records critical actions for observability and compliance.
 * Sprint 1: in-memory + console logging. Sprint 4 will persist to DB.
 */

export type AuditAction =
  | "onboarding.started"
  | "onboarding.completed"
  | "onboarding.reset"
  | "assessment.questions_generated"
  | "assessment.submitted"
  | "assessment.reset"
  | "user.profile_updated"
  | "admin.stats_viewed"
  | "admin.collaborators_viewed"
  | "admin.collaborator_detail_viewed"
  | "admin.csv_exported"
  | "auth.login"
  | "auth.logout";

export interface AuditEntry {
  timestamp: string;
  actorId: number;
  actorName: string;
  action: AuditAction;
  entity: string;
  entityId?: number | string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit entry.
 * Sprint 1: logs to console in structured JSON.
 * Sprint 4: will persist to audit_logs table.
 */
export function auditLog(entry: AuditEntry): void {
  const log = {
    ...entry,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  console.info("[AUDIT]", JSON.stringify(log));
}

/**
 * Helper to create a standard audit entry from a tRPC context.
 */
export function createAuditEntry(
  actorId: number,
  actorName: string,
  action: AuditAction,
  entity: string,
  entityId?: number | string,
  metadata?: Record<string, unknown>
): AuditEntry {
  return {
    timestamp: new Date().toISOString(),
    actorId,
    actorName,
    action,
    entity,
    entityId,
    metadata,
  };
}
