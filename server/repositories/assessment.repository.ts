/**
 * Assessment Repository — all DB operations for competency assessments.
 */
import { getDb } from "../db";
import { competencyAssessments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { AssessmentQuestion, AssessmentAnswer, RadarScore } from "../../shared/competency";

export type AssessmentStatus = "pending" | "in_progress" | "completed";

export interface AssessmentRow {
  id: number;
  userId: number;
  status: AssessmentStatus;
  questions: AssessmentQuestion[];
  answers: AssessmentAnswer[];
  radarScores: RadarScore[];
  overallScore: number | null;
  summary: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: typeof competencyAssessments.$inferSelect): AssessmentRow {
  return {
    ...row,
    status: row.status as AssessmentStatus,
    questions: (row.questions as AssessmentQuestion[]) ?? [],
    answers: (row.answers as AssessmentAnswer[]) ?? [],
    radarScores: (row.radarScores as RadarScore[]) ?? [],
    overallScore: row.overallScore ?? null,
    summary: row.summary ?? null,
  };
}

export async function findOrCreateAssessment(userId: number): Promise<AssessmentRow> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await db
    .select()
    .from(competencyAssessments)
    .where(eq(competencyAssessments.userId, userId))
    .limit(1);

  if (existing.length > 0) return mapRow(existing[0]!);

  await db.insert(competencyAssessments).values({ userId, status: "pending" });
  const created = await db
    .select()
    .from(competencyAssessments)
    .where(eq(competencyAssessments.userId, userId))
    .limit(1);

  return mapRow(created[0]!);
}

export async function saveAssessmentQuestions(
  assessmentId: number,
  questions: AssessmentQuestion[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db
    .update(competencyAssessments)
    .set({ questions, status: "in_progress" })
    .where(eq(competencyAssessments.id, assessmentId));
}

export async function saveAssessmentResults(
  assessmentId: number,
  answers: AssessmentAnswer[],
  radarScores: RadarScore[],
  overallScore: number,
  summary: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db
    .update(competencyAssessments)
    .set({
      answers,
      radarScores,
      overallScore,
      summary,
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(competencyAssessments.id, assessmentId));
}

export async function resetAssessment(assessmentId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db
    .update(competencyAssessments)
    .set({
      questions: [],
      answers: [],
      radarScores: [],
      overallScore: null,
      summary: null,
      status: "pending",
      completedAt: null,
    })
    .where(eq(competencyAssessments.id, assessmentId));
}

export async function getAssessmentByUserId(userId: number): Promise<AssessmentRow | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(competencyAssessments)
    .where(eq(competencyAssessments.userId, userId))
    .limit(1);

  return rows.length > 0 ? mapRow(rows[0]!) : null;
}

export async function getAllAssessments(): Promise<AssessmentRow[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select().from(competencyAssessments);
  return rows.map(mapRow);
}
