import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  onboardingSessions,
  competencyAssessments,
  type InsertUser,
  type AssessmentQuestion,
  type AssessmentAnswer,
  type RadarScore,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }

  // Auto-promote owner to admin
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserProfile(
  userId: number,
  data: { jobTitle?: string; department?: string; name?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

// ─── Onboarding Sessions ──────────────────────────────────────────────────────

export async function getOrCreateOnboarding(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const existing = await db
    .select()
    .from(onboardingSessions)
    .where(eq(onboardingSessions.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  await db.insert(onboardingSessions).values({ userId, status: "pending" });
  const created = await db
    .select()
    .from(onboardingSessions)
    .where(eq(onboardingSessions.userId, userId))
    .limit(1);
  return created[0]!;
}

export async function updateOnboardingMessages(
  sessionId: number,
  messages: { role: string; content: string }[],
  status?: "pending" | "in_progress" | "completed"
) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { messages };
  if (status) updateData.status = status;
  if (status === "completed") updateData.completedAt = new Date();
  await db.update(onboardingSessions).set(updateData).where(eq(onboardingSessions.id, sessionId));
}

export async function updateOnboardingProfile(
  sessionId: number,
  competencyProfile: Record<string, number>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(onboardingSessions)
    .set({ competencyProfile, status: "completed", completedAt: new Date() })
    .where(eq(onboardingSessions.id, sessionId));
}

export async function getAllOnboardingSessions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(onboardingSessions).orderBy(desc(onboardingSessions.createdAt));
}

// ─── Competency Assessments ───────────────────────────────────────────────────

export async function getOrCreateAssessment(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const existing = await db
    .select()
    .from(competencyAssessments)
    .where(eq(competencyAssessments.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  await db.insert(competencyAssessments).values({ userId, status: "pending" });
  const created = await db
    .select()
    .from(competencyAssessments)
    .where(eq(competencyAssessments.userId, userId))
    .limit(1);
  return created[0]!;
}

export async function updateAssessmentQuestions(
  assessmentId: number,
  questions: AssessmentQuestion[]
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(competencyAssessments)
    .set({ questions, status: "in_progress" })
    .where(eq(competencyAssessments.id, assessmentId));
}

export async function updateAssessmentAnswers(
  assessmentId: number,
  answers: AssessmentAnswer[],
  radarScores: RadarScore[],
  overallScore: number,
  summary: string
) {
  const db = await getDb();
  if (!db) return;
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

export async function getAssessmentByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(competencyAssessments)
    .where(eq(competencyAssessments.userId, userId))
    .limit(1);
  return result[0];
}

export async function getAllAssessments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(competencyAssessments).orderBy(desc(competencyAssessments.createdAt));
}
