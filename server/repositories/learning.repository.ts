/**
 * Learning Repository — CRUD operations for learning_plans table.
 * Follows the repository pattern established in Sprint 1.
 */
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { learningPlans, type LearningPlan, type LearningPlanRow } from "../../drizzle/schema";

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getLearningPlanByUserId(userId: number): Promise<LearningPlanRow | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(learningPlans)
    .where(eq(learningPlans.userId, userId))
    .orderBy(desc(learningPlans.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLearningPlanByAssessmentId(assessmentId: number): Promise<LearningPlanRow | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(learningPlans)
    .where(eq(learningPlans.assessmentId, assessmentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLearningPlanById(id: number): Promise<LearningPlanRow | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(learningPlans)
    .where(eq(learningPlans.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLearningPlanByUserAndAssessment(
  userId: number,
  assessmentId: number
): Promise<LearningPlanRow | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(learningPlans)
    .where(and(eq(learningPlans.userId, userId), eq(learningPlans.assessmentId, assessmentId)))
    .limit(1);
  return rows[0] ?? null;
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createLearningPlan(
  userId: number,
  assessmentId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(learningPlans).values({
    userId,
    assessmentId,
    status: "generating",
  });
  return (result[0] as { insertId: number }).insertId;
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function saveLearningPlan(
  id: number,
  plan: LearningPlan
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(learningPlans)
    .set({
      planJson: plan,
      status: "ready",
      generatedAt: new Date(),
    })
    .where(eq(learningPlans.id, id));
}

export async function updateLearningPlanStatus(
  id: number,
  status: "generating" | "ready" | "in_progress" | "completed"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(learningPlans)
    .set({ status })
    .where(eq(learningPlans.id, id));
}

/**
 * Marks a specific action as completed within the plan JSON.
 * Mutates the planJson in place and saves back to DB.
 */
export async function markActionCompleted(
  planId: number,
  domainName: string,
  actionId: string,
  completed: boolean
): Promise<LearningPlan | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(learningPlans)
    .where(eq(learningPlans.id, planId))
    .limit(1);

  const row = rows[0];
  if (!row || !row.planJson) return null;

  const plan = row.planJson as LearningPlan;

  // Find the domain and action, update in place
  const domainPlan = plan.domains.find((d) => d.domain === domainName);
  if (!domainPlan) return null;

  const action = domainPlan.actions.find((a) => a.id === actionId);
  if (!action) return null;

  action.completed = completed;
  action.completedAt = completed ? new Date().toISOString() : undefined;

  // Recalculate overall status
  const allActions = plan.domains.flatMap((d) => d.actions);
  const completedCount = allActions.filter((a) => a.completed).length;
  const newStatus: "ready" | "in_progress" | "completed" =
    completedCount === 0
      ? "ready"
      : completedCount === allActions.length
      ? "completed"
      : "in_progress";

  await db
    .update(learningPlans)
    .set({ planJson: plan, status: newStatus })
    .where(eq(learningPlans.id, planId));

  return plan;
}
