/**
 * Export CSV Route — GET /api/admin/export.csv
 * Generates a CSV with all collaborators' competency results.
 * Protected: only accessible to admin users via session cookie.
 */
import { Router, type Request, type Response } from "express";
import { sdk } from "../_core/sdk";
import { getAllUsers } from "../repositories/user.repository";
import { getAllOnboardingSessions } from "../repositories/onboarding.repository";
import { getAllAssessments } from "../repositories/assessment.repository";
import { MACRO_DOMAINS } from "../../shared/competency";
import type { RadarScore } from "../../shared/competency";
import { auditLog, createAuditEntry } from "../services/audit.service";

export const exportCsvRouter = Router();

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

exportCsvRouter.get("/api/admin/export.csv", async (req: Request, res: Response) => {
  try {
    // Authenticate via session cookie using the SDK
    let dbUser: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
    try {
      dbUser = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    if (!dbUser) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    // Check admin role
    if (dbUser.role !== "admin") {
      res.status(403).json({ error: "Acceso denegado — solo administradores P&C" });
      return;
    }

    // Fetch all data
    const [allUsers, allOnboardings, allAssessments] = await Promise.all([
      getAllUsers(),
      getAllOnboardingSessions(),
      getAllAssessments(),
    ]);

    auditLog(createAuditEntry(dbUser.id, dbUser.name ?? "unknown", "admin.csv_exported", "export"));

    // Build CSV header
    const domainHeaders = MACRO_DOMAINS.map((d) => `Score_${d.replace(/[&\s]/g, "_")}`);
    const headers = [
      "ID",
      "Nombre",
      "Email",
      "Cargo",
      "Departamento",
      "Rol",
      "Fecha_Registro",
      "Onboarding_Estado",
      "Onboarding_Completado",
      "Evaluacion_Estado",
      "Evaluacion_Completado",
      "Puntaje_General",
      ...domainHeaders,
      "Resumen_AI",
    ];

    const rows: string[] = [headers.join(",")];

    const collaborators = allUsers.filter((u) => u.role === "user");

    for (const user of collaborators) {
      const onboarding = allOnboardings.find((o) => o.userId === user.id);
      const assessment = allAssessments.find((a) => a.userId === user.id);

      const radarScores = (assessment?.radarScores ?? []) as RadarScore[];
      const domainScores = MACRO_DOMAINS.map((domain) => {
        const found = radarScores.find((r) => r.domain === domain);
        return found ? String(found.score) : "";
      });

      const row = [
        escapeCSV(user.id),
        escapeCSV(user.name),
        escapeCSV(user.email),
        escapeCSV(user.jobTitle),
        escapeCSV(user.department),
        escapeCSV(user.role),
        escapeCSV(user.createdAt.toISOString().slice(0, 10)),
        escapeCSV(onboarding?.status ?? "pending"),
        escapeCSV(onboarding?.completedAt?.toISOString().slice(0, 10) ?? ""),
        escapeCSV(assessment?.status ?? "pending"),
        escapeCSV(assessment?.completedAt?.toISOString().slice(0, 10) ?? ""),
        escapeCSV(assessment?.overallScore != null ? Math.round(assessment.overallScore) : ""),
        ...domainScores.map(escapeCSV),
        escapeCSV(assessment?.summary ?? ""),
      ];

      rows.push(row.join(","));
    }

    const csvContent = rows.join("\n");
    const filename = `itti-talent-export-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send("\uFEFF" + csvContent); // BOM for Excel compatibility
  } catch (err) {
    console.error("[export-csv] Error:", err);
    res.status(500).json({ error: "Error interno al generar el CSV" });
  }
});
