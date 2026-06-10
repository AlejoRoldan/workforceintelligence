/**
 * Rate Limiting Middleware — in-memory token bucket per IP and per user.
 * Sprint 1: in-memory (single instance). Sprint 5: Redis for multi-tenant.
 */
import type { Request, Response, NextFunction } from "express";

interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

function getKey(req: Request, prefix: string): string {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";
  return `${prefix}:${ip}`;
}

function isAllowed(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}

/** General API rate limit: 120 req / minute per IP */
export function apiRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = getKey(req, "api");
  if (!isAllowed(key, 120, 60_000)) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }
  next();
}

/** LLM-heavy endpoints: 20 req / minute per IP (onboarding, assessment) */
export function llmRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = getKey(req, "llm");
  if (!isAllowed(key, 20, 60_000)) {
    res.status(429).json({ error: "Demasiadas solicitudes al agente AI. Intenta en un momento." });
    return;
  }
  next();
}

/** Cleanup stale entries every 5 minutes to prevent memory leaks */
setInterval(() => {
  const now = Date.now();
  Array.from(buckets.entries()).forEach(([key, entry]) => {
    if (now > entry.resetAt) buckets.delete(key);
  });
}, 5 * 60_000);
