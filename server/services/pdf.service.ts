/**
 * pdf.service.ts
 * Genera un reporte PDF completo por colaborador usando html-pdf-node + Chromium.
 * Sprint A: Exportación de reportes PDF por colaborador.
 */
import htmlPdfNode from "html-pdf-node";
import type { User } from "../../drizzle/schema";
import type { LearningPlan, RadarScore } from "../../drizzle/schema";

export interface CollaboratorReportData {
  user: Pick<User, "name" | "email" | "jobTitle" | "department">;
  onboardingStatus: string;
  assessmentStatus: string;
  overallScore: number | null;
  radarScores: RadarScore[] | null;
  summary: string | null;
  learningPlan: LearningPlan | null;
  generatedAt: Date;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completado",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Crítica",
  moderate: "Moderada",
  "on-track": "En nivel",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#f43f5e",
  moderate: "#f59e0b",
  "on-track": "#10b981",
};

function scoreBar(score: number, expected: number): string {
  const pct = Math.min(100, Math.max(0, score));
  const expPct = Math.min(100, Math.max(0, expected));
  const color = score >= expected - 5 ? "#10b981" : score >= expected - 20 ? "#f59e0b" : "#f43f5e";
  return `
    <div style="position:relative;height:8px;background:#f1f5f9;border-radius:4px;overflow:visible;margin:4px 0;">
      <div style="position:absolute;left:0;top:0;height:8px;width:${pct}%;background:${color};border-radius:4px;transition:width 0.3s;"></div>
      <div style="position:absolute;top:-3px;left:${expPct}%;width:2px;height:14px;background:#64748b;border-radius:1px;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:2px;">
      <span>${score}/100</span>
      <span>Esperado: ${expected}</span>
    </div>
  `;
}

export async function generateCollaboratorPDF(data: CollaboratorReportData): Promise<Buffer> {
  const { user, onboardingStatus, assessmentStatus, overallScore, radarScores, summary, learningPlan, generatedAt } = data;

  const scoreColor = overallScore == null ? "#64748b"
    : overallScore >= 70 ? "#10b981"
    : overallScore >= 50 ? "#f59e0b"
    : "#f43f5e";

  const radarHtml = radarScores && radarScores.length > 0
    ? radarScores.map((r) => `
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:600;color:#1e293b;">${r.domain}</span>
          <span style="font-size:11px;color:#64748b;">${r.score} / ${r.expected}</span>
        </div>
        ${scoreBar(r.score, r.expected)}
      </div>
    `).join("")
    : "<p style='color:#94a3b8;font-size:12px;'>Sin datos de evaluación disponibles.</p>";

  const planHtml = learningPlan && learningPlan.domains && learningPlan.domains.length > 0
    ? learningPlan.domains.map((d) => `
      <div style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:8px;border-left:3px solid ${PRIORITY_COLORS[d.priority] ?? '#64748b'};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:13px;font-weight:700;color:#1e293b;">${d.domain}</span>
          <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;background:${PRIORITY_COLORS[d.priority] ?? '#64748b'}20;color:${PRIORITY_COLORS[d.priority] ?? '#64748b'};">
            ${PRIORITY_LABELS[d.priority] ?? d.priority}
          </span>
        </div>
        <p style="font-size:11px;color:#64748b;margin:0 0 10px;">${d.rationale}</p>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${d.actions.map((a) => `
            <div style="display:flex;align-items:flex-start;gap:8px;padding:8px;background:white;border-radius:6px;border:1px solid #e2e8f0;">
              <div style="width:6px;height:6px;border-radius:50%;background:${PRIORITY_COLORS[d.priority] ?? '#64748b'};margin-top:4px;flex-shrink:0;"></div>
              <div>
                <p style="font-size:11px;font-weight:600;color:#1e293b;margin:0 0 2px;">${a.title}</p>
                <p style="font-size:10px;color:#64748b;margin:0;">${a.description} · ${a.estimatedHours}h estimadas</p>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("")
    : "<p style='color:#94a3b8;font-size:12px;'>Plan de aprendizaje no disponible aún.</p>";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Talento — ${user.name ?? "Colaborador"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: white; }
    .page { padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22px; font-weight: 800; color: #1e293b; }
    h2 { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; }
    .section { margin-bottom: 32px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .card-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .card-value { font-size: 14px; font-weight: 700; color: #1e293b; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #17B890;">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#17B890,#0f9e7a);display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:800;font-size:14px;">IT</span>
        </div>
        <span style="font-size:14px;font-weight:700;color:#17B890;">IttiTalent</span>
      </div>
      <h1>${user.name ?? "Colaborador"}</h1>
      <p style="font-size:13px;color:#64748b;margin-top:4px;">${user.jobTitle ?? "Sin cargo"} · ${user.department ?? "Sin departamento"}</p>
      <p style="font-size:11px;color:#94a3b8;margin-top:2px;">${user.email ?? ""}</p>
    </div>
    <div style="text-align:right;">
      ${overallScore != null ? `
        <div style="font-size:36px;font-weight:900;color:${scoreColor};line-height:1;">${Math.round(overallScore)}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Puntaje Global /100</div>
      ` : `<div style="font-size:13px;color:#94a3b8;">Sin evaluación</div>`}
      <p style="font-size:10px;color:#94a3b8;margin-top:8px;">Generado: ${generatedAt.toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })}</p>
    </div>
  </div>

  <!-- Estado del proceso -->
  <div class="section">
    <h2>Estado del Proceso</h2>
    <div class="grid-2">
      <div class="card">
        <div class="card-label">Onboarding Conversacional</div>
        <div class="card-value">${STATUS_LABELS[onboardingStatus] ?? onboardingStatus}</div>
      </div>
      <div class="card">
        <div class="card-label">Proof of Skills</div>
        <div class="card-value">${STATUS_LABELS[assessmentStatus] ?? assessmentStatus}</div>
      </div>
    </div>
  </div>

  <!-- Resumen AI -->
  ${summary ? `
  <div class="section">
    <h2>Resumen de Competencias (AI)</h2>
    <div style="padding:16px;background:#f0fdf9;border-radius:8px;border-left:3px solid #17B890;">
      <p style="font-size:12px;color:#374151;line-height:1.6;">${summary}</p>
    </div>
  </div>
  ` : ""}

  <!-- Radar de competencias -->
  <div class="section">
    <h2>Evaluación por Macro Dominio</h2>
    ${radarHtml}
  </div>

  <!-- Plan de aprendizaje -->
  <div class="section">
    <h2>Ruta de Aprendizaje Personalizada</h2>
    ${learningPlan?.executiveSummary ? `
      <div style="padding:12px 16px;background:#eff6ff;border-radius:8px;margin-bottom:16px;border-left:3px solid #3b82f6;">
        <p style="font-size:12px;color:#1e40af;line-height:1.6;">${learningPlan.executiveSummary}</p>
      </div>
    ` : ""}
    ${planHtml}
  </div>

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:10px;color:#94a3b8;">IttiTalent — Plataforma de Gestión de Talento por Competencias</span>
    <span style="font-size:10px;color:#94a3b8;">Documento confidencial · Uso interno</span>
  </div>

</div>
</body>
</html>
  `;

  const options = {
    format: "A4" as const,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    printBackground: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: "/usr/bin/chromium",
  };

  const file = { content: html };
  const pdfBuffer = await htmlPdfNode.generatePdf(file, options);
  return pdfBuffer;
}
