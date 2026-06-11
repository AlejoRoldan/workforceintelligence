/**
 * assessment-history.repository.ts — CRUD para assessment_history.
 * Sprint D: Historial de evaluaciones — snapshots de cada assessment completado.
 */
import { getDb } from "../db";
import {
  assessmentHistory,
  type AssessmentHistoryRow,
  type InsertAssessmentHistory,
} from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export async function createAssessmentSnapshot(
  data: InsertAssessmentHistory
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(assessmentHistory).values(data);
}

export async function getAssessmentHistoryByUserId(
  userId: number
): Promise<AssessmentHistoryRow[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assessmentHistory)
    .where(eq(assessmentHistory.userId, userId))
    .orderBy(desc(assessmentHistory.completedAt));
}

export async function getAllAssessmentHistory(): Promise<AssessmentHistoryRow[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assessmentHistory)
    .orderBy(desc(assessmentHistory.completedAt));
}
