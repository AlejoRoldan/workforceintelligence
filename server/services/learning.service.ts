/**
 * Learning Service — AI-powered personalized learning path generation.
 * Analyzes competency gaps from assessment results and produces a structured
 * development plan with concrete actions, resources and time estimates.
 */
import { invokeLLM } from "../_core/llm";
import { nanoid } from "nanoid";
import type {
  LearningPlan,
  LearningDomainPlan,
  LearningAction,
  RadarScore,
  MacroDomain,
} from "../../drizzle/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratePlanInput {
  collaboratorName: string;
  jobTitle: string;
  department: string;
  radarScores: RadarScore[];
  assessmentSummary: string;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildLearningPlanPrompt(input: GeneratePlanInput): string {
  const gapLines = input.radarScores
    .map((r) => {
      const gap = r.expected - r.score;
      const severity =
        gap > 20 ? "CRÍTICO" : gap > 0 ? "MODERADO" : "EN NIVEL";
      return `- ${r.domain}: actual=${r.score}/100, esperado=${r.expected}/100, brecha=${gap > 0 ? "+" + gap : gap} (${severity})`;
    })
    .join("\n");

  return `Eres un experto en desarrollo organizacional y aprendizaje corporativo para la empresa Itti Paraguay.
Tu tarea es generar un plan de desarrollo personalizado y accionable para un colaborador, basado en los resultados de su evaluación de competencias.

PERFIL DEL COLABORADOR:
- Nombre: ${input.collaboratorName}
- Cargo: ${input.jobTitle}
- Área: ${input.department}

RESULTADOS DE EVALUACIÓN POR MACRO DOMINIO:
${gapLines}

RESUMEN DE LA EVALUACIÓN:
${input.assessmentSummary}

INSTRUCCIONES:
1. Genera un plan SOLO para los dominios con brecha > 0 (donde actual < esperado).
2. Para cada dominio con brecha, proporciona 2-4 acciones concretas y realizables.
3. Las acciones deben ser específicas para el contexto organizacional paraguayo y latinoamericano.
4. Incluye recursos reales y accesibles (plataformas como Coursera, LinkedIn Learning, YouTube, libros específicos).
5. Estima horas realistas para cada acción (entre 2 y 40 horas).
6. Prioriza según la magnitud de la brecha: crítico (>20), moderado (1-20).
7. El resumen ejecutivo debe ser motivador y específico para el cargo del colaborador.

Responde ÚNICAMENTE con el siguiente JSON (sin markdown, sin explicaciones adicionales):
{
  "executiveSummary": "string (2-3 oraciones motivadoras y específicas)",
  "topPriorityDomain": "nombre exacto del dominio con mayor brecha",
  "overallGapScore": number (promedio ponderado de brechas, 0-100),
  "domains": [
    {
      "domain": "nombre exacto del macro dominio",
      "currentScore": number,
      "expectedScore": number,
      "gap": number (positivo = por debajo del esperado),
      "priority": "critical" | "moderate" | "on-track",
      "rationale": "string (por qué este dominio es importante para su cargo)",
      "actions": [
        {
          "title": "string (acción concreta y específica)",
          "description": "string (1-2 oraciones explicando qué hacer y por qué)",
          "resourceType": "course" | "book" | "practice" | "mentoring" | "project",
          "resourceUrl": "string (URL real si existe, omitir si no)",
          "estimatedHours": number,
          "priority": "high" | "medium" | "low"
        }
      ]
    }
  ]
}`;
}

// ── Core generation function ──────────────────────────────────────────────────

export async function generateLearningPlan(input: GeneratePlanInput): Promise<LearningPlan> {
  const prompt = buildLearningPlanPrompt(input);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Eres un experto en desarrollo de talento organizacional. Respondes ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "learning_plan",
        strict: false,
        schema: {
          type: "object",
          properties: {
            executiveSummary: { type: "string" },
            topPriorityDomain: { type: "string" },
            overallGapScore: { type: "number" },
            domains: { type: "array" },
          },
          required: ["executiveSummary", "topPriorityDomain", "overallGapScore", "domains"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("LLM returned empty response for learning plan");
  const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

  let parsed: {
    executiveSummary: string;
    topPriorityDomain: string;
    overallGapScore: number;
    domains: Array<{
      domain: string;
      currentScore: number;
      expectedScore: number;
      gap: number;
      priority: string;
      rationale: string;
      actions: Array<{
        title: string;
        description: string;
        resourceType: string;
        resourceUrl?: string;
        estimatedHours: number;
        priority: string;
      }>;
    }>;
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try to extract JSON from potential markdown wrapper
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse LLM response as JSON");
    parsed = JSON.parse(match[0]);
  }

  // Enrich with IDs and completed flags (not returned by LLM)
  const domains: LearningDomainPlan[] = parsed.domains.map((d) => ({
    domain: d.domain as MacroDomain,
    currentScore: d.currentScore,
    expectedScore: d.expectedScore,
    gap: d.gap,
    priority: d.priority as "critical" | "moderate" | "on-track",
    rationale: d.rationale,
    actions: d.actions.map((a): LearningAction => ({
      id: nanoid(8),
      title: a.title,
      description: a.description,
      resourceType: a.resourceType as LearningAction["resourceType"],
      resourceUrl: a.resourceUrl,
      estimatedHours: a.estimatedHours,
      priority: a.priority as "high" | "medium" | "low",
      completed: false,
    })),
  }));

  const allActions = domains.flatMap((d) => d.actions);
  const totalHours = allActions.reduce((sum, a) => sum + a.estimatedHours, 0);

  const plan: LearningPlan = {
    version: 1,
    collaboratorName: input.collaboratorName,
    jobTitle: input.jobTitle,
    generatedAt: new Date().toISOString(),
    overallGapScore: parsed.overallGapScore,
    topPriorityDomain: parsed.topPriorityDomain as MacroDomain,
    executiveSummary: parsed.executiveSummary,
    domains,
    totalActions: allActions.length,
    estimatedTotalHours: totalHours,
  };

  return plan;
}

// ── Gap analysis helper ───────────────────────────────────────────────────────

export function classifyGapPriority(
  current: number,
  expected: number
): "critical" | "moderate" | "on-track" {
  const gap = expected - current;
  if (gap > 20) return "critical";
  if (gap > 0) return "moderate";
  return "on-track";
}

export function hasSignificantGaps(radarScores: RadarScore[]): boolean {
  return radarScores.some((r) => r.expected - r.score > 0);
}
