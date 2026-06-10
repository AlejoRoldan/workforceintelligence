/**
 * Permissions Middleware — RBAC for tRPC procedures.
 * Centralizes role-based access control logic.
 */
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";

export type AppRole = "user" | "admin";

/**
 * Procedure that requires admin role.
 * Throws FORBIDDEN for any non-admin authenticated user.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo Administradores P&C pueden acceder a este recurso.",
    });
  }
  return next({ ctx });
});

/**
 * Verify that the requesting user owns the resource (or is admin).
 * Throws FORBIDDEN if the userId doesn't match and user is not admin.
 */
export function assertOwnerOrAdmin(requestingUserId: number, resourceUserId: number, role: AppRole): void {
  if (role !== "admin" && requestingUserId !== resourceUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tienes permisos para acceder a este recurso.",
    });
  }
}
