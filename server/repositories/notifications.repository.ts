/**
 * notifications.repository.ts
 * Data access layer for in-app notifications (admin P&C events).
 */
import { getDb } from "../db";
import { notifications, type InsertNotification, type Notification } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// ─── Read ──────────────────────────────────────────────────────────────────────

/** Get all unread notifications for a user, newest first */
export async function getUnreadNotifications(userId: number): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

/** Get all notifications for a user (read + unread), newest first */
export async function getAllNotifications(userId: number): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
}

/** Count unread notifications for a user */
export async function countUnread(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows.length;
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/** Create a new notification for all admin users */
export async function createNotification(data: InsertNotification): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

/** Mark a single notification as read */
export async function markNotificationRead(notificationId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

/** Mark all notifications as read for a user */
export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, userId));
}
