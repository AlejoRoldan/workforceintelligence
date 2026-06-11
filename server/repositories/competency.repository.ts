/**
 * Competency Repository — Sprint 2
 * Handles all DB operations for competency_domains, role_skill_expectations, competency_evidence.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  competencyDomains,
  roleSkillExpectations,
  competencyEvidence,
  type CompetencyDomain,
  type RoleSkillExpectation,
  type InsertCompetencyEvidence,
} from "../../drizzle/schema";

// ─── Domains ──────────────────────────────────────────────────────────────────

export async function getAllDomains(): Promise<CompetencyDomain[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(competencyDomains)
    .where(eq(competencyDomains.active, true))
    .orderBy(competencyDomains.displayOrder);
}

export async function getDomainByName(name: string): Promise<CompetencyDomain | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(competencyDomains)
    .where(eq(competencyDomains.name, name))
    .limit(1);
  return rows[0];
}

// ─── Role Skill Expectations ──────────────────────────────────────────────────

/**
 * Returns expectations for a given role name.
 * Falls back to "Default" if the role has no specific expectations.
 */
export async function getExpectationsForRole(
  roleName: string
): Promise<RoleSkillExpectation[]> {
  const db = await getDb();
  if (!db) return [];

  // Normalize role: try exact match first, then keyword match, then Default
  const normalizedRole = normalizeRole(roleName);

  let rows = await db
    .select()
    .from(roleSkillExpectations)
    .where(eq(roleSkillExpectations.roleName, normalizedRole));

  if (rows.length === 0) {
    rows = await db
      .select()
      .from(roleSkillExpectations)
      .where(eq(roleSkillExpectations.roleName, "Default"));
  }

  return rows;
}

/**
 * Maps a free-text job title to one of the seeded role names.
 * Analista → Analista, Líder/Coordinador → Líder, Gerente/Director → Gerente, else Default.
 */
export function normalizeRole(jobTitle: string): string {
  const lower = jobTitle.toLowerCase();
  if (lower.includes("gerente") || lower.includes("director") || lower.includes("head")) {
    return "Gerente";
  }
  if (
    lower.includes("líder") ||
    lower.includes("lider") ||
    lower.includes("coordinador") ||
    lower.includes("supervisor") ||
    lower.includes("jefe")
  ) {
    return "Líder";
  }
  if (lower.includes("analista") || lower.includes("especialista") || lower.includes("técnico")) {
    return "Analista";
  }
  return "Default";
}

// ─── Competency Evidence ──────────────────────────────────────────────────────

export async function saveEvidence(entry: InsertCompetencyEvidence): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(competencyEvidence).values(entry);
}

export async function getEvidenceByAssessment(
  assessmentId: number
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(competencyEvidence)
    .where(eq(competencyEvidence.assessmentId, assessmentId));
}

export async function getEvidenceByDomain(
  assessmentId: number,
  domainId: number
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(competencyEvidence)
    .where(
      and(
        eq(competencyEvidence.assessmentId, assessmentId),
        eq(competencyEvidence.domainId, domainId)
      )
    );
}

// ─── Role Profile Management (Sprint D) ──────────────────────────────────────

/** Get all role expectations (all roles, all domains) */
export async function getAllRoleExpectations(): Promise<RoleSkillExpectation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(roleSkillExpectations);
}

/** Replace all expectations for a role (upsert by roleName + domainId) */
export async function upsertRoleExpectations(
  roleName: string,
  expectations: Array<{ domainId: number; expectedScore: number; weight: number }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete existing expectations for this role
  await db.delete(roleSkillExpectations).where(eq(roleSkillExpectations.roleName, roleName));
  // Insert new ones
  if (expectations.length > 0) {
    await db.insert(roleSkillExpectations).values(
      expectations.map((e) => ({
        roleName,
        domainId: e.domainId,
        expectedScore: e.expectedScore,
        weight: e.weight,
      }))
    );
  }
}

/** Delete all expectations for a role */
export async function deleteRoleExpectations(roleName: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(roleSkillExpectations).where(eq(roleSkillExpectations.roleName, roleName));
}
