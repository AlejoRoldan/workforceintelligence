/**
 * invitations.repository.ts — CRUD para user_invitations.
 * Sprint D: Gestión de usuarios — invitaciones por token único.
 */
import { getDb } from "../db";
import { userInvitations, type InsertUserInvitation, type UserInvitation } from "../../drizzle/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

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

/** Busca una invitación pendiente y no expirada. */
export async function findRedeemableInvitation(token: string): Promise<UserInvitation | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(userInvitations)
    .where(and(eq(userInvitations.token, token), isNull(userInvitations.usedAt)))
    .limit(1);
  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  return row;
}

/** Compatibilidad para procesos administrativos que solo marcan un token. */
export async function markInvitationUsed(token: string, usedByUserId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userInvitations)
    .set({ usedAt: new Date(), usedByUserId })
    .where(eq(userInvitations.token, token));
}

/** Marca el token solo si sigue pendiente: evita doble canje concurrente. */
export async function redeemInvitation(token: string, usedByUserId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(userInvitations)
    .set({ usedAt: new Date(), usedByUserId })
    .where(and(eq(userInvitations.token, token), isNull(userInvitations.usedAt)));
  const affectedRows = (result as unknown as { affectedRows?: number }).affectedRows ?? 0;
  return affectedRows === 1;
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
