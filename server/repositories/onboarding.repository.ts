/**
 * Onboarding Repository — all DB operations for onboarding sessions.
 * Isolates data access from business logic in routers.
 */
import { getDb } from "../db";
import { onboardingSessions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type OnboardingStatus = "pending" | "in_progress" | "completed";

export interface OnboardingSessionRow {
  id: number;
  userId: number;
  status: OnboardingStatus;
  messages: { role: string; content: string }[];
  competencyProfile: Record<string, number> | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: typeof onboardingSessions.$inferSelect): OnboardingSessionRow {
  return {
    ...row,
    status: row.status as OnboardingStatus,
    messages: (row.messages as { role: string; content: string }[]) ?? [],
    competencyProfile: (row.competencyProfile as Record<string, number> | null) ?? null,
  };
}

export async function findOrCreateOnboarding(userId: number): Promise<OnboardingSessionRow> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await db
    .select()
    .from(onboardingSessions)
    .where(eq(onboardingSessions.userId, userId))
    .limit(1);

  if (existing.length > 0) return mapRow(existing[0]!);

  await db.insert(onboardingSessions).values({ userId, status: "pending" });
  const created = await db
    .select()
    .from(onboardingSessions)
    .where(eq(onboardingSessions.userId, userId))
    .limit(1);

  return mapRow(created[0]!);
}

export async function saveOnboardingMessages(
  sessionId: number,
  messages: { role: string; content: string }[],
  status: OnboardingStatus
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db
    .update(onboardingSessions)
    .set({ messages, status })
    .where(eq(onboardingSessions.id, sessionId));
}

export async function saveOnboardingProfile(
  sessionId: number,
  competencyProfile: Record<string, number>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db
    .update(onboardingSessions)
    .set({ competencyProfile, completedAt: new Date() })
    .where(eq(onboardingSessions.id, sessionId));
}

export async function resetOnboarding(sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db
    .update(onboardingSessions)
    .set({ messages: [], status: "pending", competencyProfile: null, completedAt: null })
    .where(eq(onboardingSessions.id, sessionId));
}

export async function getAllOnboardingSessions(): Promise<OnboardingSessionRow[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select().from(onboardingSessions);
  return rows.map(mapRow);
}
