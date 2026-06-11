/**
 * export-pdf.ts
 * Express route: GET /api/export/collaborator-pdf/:userId
 * Genera y descarga el reporte PDF de un colaborador (solo admins).
 * Sprint A: Exportación PDF por colaborador.
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { getAllUsers } from "../repositories/user.repository";
import { getAssessmentByUserId } from "../repositories/assessment.repository";
import { getOnboardingByUserId } from "../repositories/onboarding.repository";
import { getLearningPlanByUserId } from "../repositories/learning.repository";
import { generateCollaboratorPDF } from "../services/pdf.service";

export async function exportCollaboratorPdf(req: Request, res: Response): Promise<void> {
  try {
    // Auth check — must be admin
    let authUser: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
    try {
      authUser = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    if (!authUser || authUser.role !== "admin") {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }

    const userId = parseInt(req.params.userId ?? "0");
    if (!userId || isNaN(userId)) {
      res.status(400).json({ error: "userId inválido" });
      return;
    }

    // Gather collaborator data
    const allUsers = await getAllUsers();
    const user = allUsers.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: "Colaborador no encontrado" });
      return;
    }

    const [onboarding, assessment, learningPlanRow] = await Promise.all([
      getOnboardingByUserId(userId),
      getAssessmentByUserId(userId),
      getLearningPlanByUserId(userId),
    ]);

    const pdfBuffer = await generateCollaboratorPDF({
      user: {
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        department: user.department,
      },
      onboardingStatus: onboarding?.status ?? "pending",
      assessmentStatus: assessment?.status ?? "pending",
      overallScore: assessment?.overallScore ?? null,
      radarScores: assessment?.radarScores ?? null,
      summary: assessment?.summary ?? null,
      learningPlan: learningPlanRow?.planJson ?? null,
      generatedAt: new Date(),
    });

    const safeName = (user.name ?? "colaborador")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-${safeName}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error("[export-pdf] Error:", err);
    res.status(500).json({ error: "Error generando el PDF" });
  }
}
