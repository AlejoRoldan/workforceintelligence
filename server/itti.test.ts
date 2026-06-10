/**
 * IttiTalent — Sprint 1 Test Suite
 * Covers: auth, admin RBAC, scoring service, gap analysis, audit service, permissions, rate limit
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// ─── Context factory ──────────────────────────────────────────────────────────

function makeCtx(role: "user" | "admin" = "user"): {
  ctx: TrpcContext;
  clearedCookies: { name: string; options: Record<string, unknown> }[];
} {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: role === "admin" ? 1 : 2,
    openId: `${role}-open-id`,
    email: `${role}@itti.com`,
    name: role === "admin" ? "Admin P&C" : "Colaborador Test",
    loginMethod: "manus",
    role,
    jobTitle: "Analista",
    department: "People & Culture",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

// ─── auth.logout ──────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const { ctx, clearedCookies } = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true });
  });
});

// ─── auth.me ──────────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const { ctx } = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me?.email).toBe("user@itti.com");
    expect(me?.role).toBe("user");
  });

  it("returns null when unauthenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });
});

// ─── admin guard ──────────────────────────────────────────────────────────────

describe("admin.getStats — RBAC enforcement", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const { ctx } = makeCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getStats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN on getCollaborators for non-admin", async () => {
    const { ctx } = makeCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getCollaborators()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─── Scoring Service ──────────────────────────────────────────────────────────

describe("scoring.service — calculateGapAnalysis", () => {
  it("classifies domains correctly by gap severity", async () => {
    const { calculateGapAnalysis } = await import("./services/scoring.service");

    const scores = [
      { domain: "Digital & GenAI" as const, score: 85, expected: 70 },    // exceeds (+15)
      { domain: "Liderazgo Moderno" as const, score: 68, expected: 65 },   // on-track (+3)
      { domain: "Operación Ágil" as const, score: 60, expected: 75 },      // moderate (-15)
      { domain: "Customer Experience" as const, score: 40, expected: 70 }, // critical (-30)
      { domain: "Data-driven" as const, score: 65, expected: 65 },         // on-track (0)
      { domain: "Innovación" as const, score: 70, expected: 60 },          // exceeds (+10)
    ];

    const gaps = calculateGapAnalysis(scores);

    // Most critical first
    expect(gaps[0]?.severity).toBe("critical");
    expect(gaps[0]?.domain).toBe("Customer Experience");
    expect(gaps[0]?.gap).toBe(-30);

    const exceeds = gaps.filter((g) => g.severity === "exceeds");
    expect(exceeds).toHaveLength(2);

    const critical = gaps.filter((g) => g.severity === "critical");
    expect(critical).toHaveLength(1);
  });

  it("returns empty array for empty input", async () => {
    const { calculateGapAnalysis } = await import("./services/scoring.service");
    expect(calculateGapAnalysis([])).toEqual([]);
  });

  it("gap is correctly calculated as score minus expected", async () => {
    const { calculateGapAnalysis } = await import("./services/scoring.service");
    const result = calculateGapAnalysis([
      { domain: "Innovación" as const, score: 55, expected: 60 },
    ]);
    expect(result[0]?.gap).toBe(-5);
    expect(result[0]?.severity).toBe("on-track"); // gap = -5, threshold is >= -5
  });
});

// ─── Audit Service ────────────────────────────────────────────────────────────

describe("audit.service", () => {
  it("createAuditEntry builds a valid entry with all required fields", async () => {
    const { createAuditEntry } = await import("./services/audit.service");

    const entry = createAuditEntry(
      1, "Admin P&C", "assessment.submitted", "assessment", 42, { overallScore: 75 }
    );

    expect(entry.actorId).toBe(1);
    expect(entry.actorName).toBe("Admin P&C");
    expect(entry.action).toBe("assessment.submitted");
    expect(entry.entity).toBe("assessment");
    expect(entry.entityId).toBe(42);
    expect(entry.metadata?.overallScore).toBe(75);
    expect(entry.timestamp).toBeTruthy();
    expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
  });

  it("auditLog does not throw for valid entries", async () => {
    const { auditLog, createAuditEntry } = await import("./services/audit.service");
    const entry = createAuditEntry(1, "Test User", "auth.login", "session");
    expect(() => auditLog(entry)).not.toThrow();
  });

  it("auditLog handles all defined action types", async () => {
    const { auditLog, createAuditEntry } = await import("./services/audit.service");
    const actions = [
      "onboarding.started", "onboarding.completed", "onboarding.reset",
      "assessment.questions_generated", "assessment.submitted", "assessment.reset",
      "user.profile_updated", "admin.stats_viewed", "auth.login", "auth.logout",
    ] as const;
    for (const action of actions) {
      const entry = createAuditEntry(1, "Test", action, "test");
      expect(() => auditLog(entry)).not.toThrow();
    }
  });
});

// ─── Permissions ──────────────────────────────────────────────────────────────

describe("permissions — assertOwnerOrAdmin", () => {
  it("allows admin to access any resource", async () => {
    const { assertOwnerOrAdmin } = await import("./middleware/permissions");
    expect(() => assertOwnerOrAdmin(1, 99, "admin")).not.toThrow();
  });

  it("allows user to access their own resource", async () => {
    const { assertOwnerOrAdmin } = await import("./middleware/permissions");
    expect(() => assertOwnerOrAdmin(5, 5, "user")).not.toThrow();
  });

  it("throws FORBIDDEN when user accesses another user's resource", async () => {
    const { assertOwnerOrAdmin } = await import("./middleware/permissions");
    const { TRPCError } = await import("@trpc/server");
    expect(() => assertOwnerOrAdmin(5, 10, "user")).toThrow(TRPCError);
  });
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────

describe("rate-limit middleware", () => {
  it("allows requests within limit and calls next()", async () => {
    const { apiRateLimit } = await import("./middleware/rate-limit");
    const next = vi.fn();
    const req = {
      headers: {},
      socket: { remoteAddress: "10.0.0.1" },
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    apiRateLimit(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("llmRateLimit allows requests within limit", async () => {
    const { llmRateLimit } = await import("./middleware/rate-limit");
    const next = vi.fn();
    const req = {
      headers: {},
      socket: { remoteAddress: "10.0.0.2" },
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    llmRateLimit(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
