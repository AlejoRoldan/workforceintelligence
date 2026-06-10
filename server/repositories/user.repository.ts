/**
 * User Repository — all DB operations for users.
 */
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { User, InsertUser } from "../../drizzle/schema";

export type { User };

export async function findUserByOpenId(openId: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows.length > 0 ? rows[0]! : null;
}

export async function findUserById(id: number): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows.length > 0 ? rows[0]! : null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db.insert(users).values(user).onDuplicateKeyUpdate({ set: user });
}

export async function updateUserProfile(
  userId: number,
  data: { name?: string; jobTitle?: string; department?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const updateData: Partial<User> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
  if (data.department !== undefined) updateData.department = data.department;

  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(users);
}

export async function promoteToAdmin(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
}
