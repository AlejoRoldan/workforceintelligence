import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(role: "user" | "admin" = "user"): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@itti.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    jobTitle: "Analista",
    department: "Tecnología",
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
    expect(me?.email).toBe("test@itti.com");
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
describe("admin.getStats — role guard", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const { ctx } = makeCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getStats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
