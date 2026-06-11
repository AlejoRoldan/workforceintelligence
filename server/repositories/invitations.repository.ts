/**
 * invitations.repository.ts — CRUD para user_invitations.
 * Sprint D: Gestión de usuarios — invitaciones por token único.
 */
import { getDb } from "../db";
import { userInvitations, type InsertUserInvitation, type UserInvitation } from "../../drizzle/schema";
import { eq, desc, isNull } from "drizzle-orm";

export async function createInvitation(data: InsertUserInvitation): Promise<UserInvitation | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(userInvitations).values(data);
  const [row] = await db
    .select()
    .from(userInvitations)
    .where(eq(userInvitations.token, data.token))
    .limit(1);
  return row ?? null;
}

export async function findInvitationByToken(token: string): Promise<UserInvitation | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(userInvitations)
    .where(eq(userInvitations.token, token))
    .limit(1);
  return row ?? null;
}

export async function markInvitationUsed(token: string, usedByUserId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userInvitations)
    .set({ usedAt: new Date(), usedByUserId })
    .where(eq(userInvitations.token, token));
}

export async function getAllInvitations(): Promise<UserInvitation[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userInvitations)
    .orderBy(desc(userInvitations.createdAt));
}

export async function getPendingInvitations(): Promise<UserInvitation[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userInvitations)
    .where(isNull(userInvitations.usedAt))
    .orderBy(desc(userInvitations.createdAt));
}
