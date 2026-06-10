/**
 * LLM Service — centralizes all AI prompt construction and invocation.
 * No prompt logic should exist outside this file.
 */
import { invokeLLM } from "../_core/llm";
import { MACRO_DOMAINS, type AssessmentQuestion, type AssessmentAnswer } from "../../shared/competency";

// ─── Onboarding ───────────────────────────────────────────────────────────────

export function buildOnboardingSystemPrompt(userName: string, jobTitle?: string | null): string {
  return `Eres el Agente de Onboarding de IttiTalent, la plataforma de gestión de talento de People & Culture.
Tu misión es conocer a ${userName}${jobTitle ? `, quien trabaja como ${jobTitle}` : ""}, de manera conversacional y amigable, para construir su perfil de competencias dentro del Framework de 4 Capas:

1. **Competencias Organizacionales**: valores, cultura, trabajo en equipo, comunicación
2. **Competencias de Liderazgo**: gestión de equipos, toma de decisiones, influencia
3. **Competencias Funcionales**: habilidades técnicas específicas del rol
4. **Competencias Estratégicas Futuras**: adaptabilidad, innovación, pensamiento digital

También evalúas los 6 Macro Dominios estratégicos:
- Digital & GenAI, Liderazgo Moderno, Operación Ágil, Customer Experience, Data-driven, Innovación

INSTRUCCIONES:
- Sé cálido, profesional y empático. Usa el nombre de la persona.
- Haz UNA pregunta a la vez. Escucha activamente y adapta las siguientes preguntas según las respuestas.
- Cubre las 4 capas de competencias de forma natural, sin que parezca un formulario.
- Después de 6-8 intercambios, indica que el onboarding está completo y resume brevemente el perfil detectado.
- Cuando el onboarding esté completo, termina tu último mensaje con exactamente: [ONBOARDING_COMPLETE]
- Responde siempre en español.`;
}

export async function invokeOnboardingChat(
  systemPrompt: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  });
  const raw = response.choices[0]?.message?.content;
  return typeof raw === "string" ? raw : "Gracias por tu respuesta.";
}

// ─── Assessment question generation ──────────────────────────────────────────

export function buildAssessmentSystemPrompt(userName: string, jobTitle?: string | null): string {
  return `Eres el evaluador de competencias de IttiTalent para ${userName}${jobTitle ? ` (${jobTitle})` : ""}.
Tu tarea es generar exactamente 6 preguntas de evaluación, una por cada Macro Dominio estratégico:
1. Digital & GenAI
2. Liderazgo Moderno
3. Operación Ágil
4. Customer Experience
5. Data-driven
6. Innovación

Cada pregunta debe:
- Ser abierta y relevante para el rol de la persona
- Evaluar competencias reales y aplicadas
- Ser clara y concisa (máximo 2 oraciones)

Responde ÚNICAMENTE con un JSON válido con este formato exacto:
{
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "macroDomain": "Digital & GenAI",
      "competencyLayer": "Funcionales",
      "type": "open"
    }
  ]
}`;
}

export async function generateAssessmentQuestions(
  userName: string,
  jobTitle?: string | null
): Promise<AssessmentQuestion[]> {
  const systemPrompt = buildAssessmentSystemPrompt(userName, jobTitle);

  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: systemPrompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "assessment_questions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    question: { type: "string" },
                    macroDomain: { type: "string" },
                    competencyLayer: { type: "string" },
                    type: { type: "string" },
                  },
                  required: ["id", "question", "macroDomain", "competencyLayer", "type"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
    const questions: AssessmentQuestion[] = parsed.questions ?? [];
    if (questions.length === 6) return questions;
  } catch {
    // Fall through to fallback
  }

  // Deterministic fallback — no random values
  return MACRO_DOMAINS.map((domain, i) => ({
    id: `q${i + 1}`,
    question: `Describe una situación reciente donde aplicaste competencias de ${domain} en tu trabajo y qué resultado obtuviste.`,
    macroDomain: domain,
    competencyLayer: "Funcionales" as const,
    type: "open" as const,
  }));
}

// ─── Answer evaluation (structured, no random) ───────────────────────────────

const EVALUATION_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number", description: "Score from 0 to 100" },
    confidence: { type: "number", description: "AI confidence from 0 to 1" },
    evidence: { type: "array", items: { type: "string" }, description: "Key phrases from the answer" },
    rationale: { type: "string", description: "Brief explanation of the score" },
    feedback: { type: "string", description: "Constructive feedback in Spanish" },
  },
  required: ["score", "confidence", "evidence", "rationale", "feedback"],
  additionalProperties: false,
};

export async function evaluateAnswer(
  question: string,
  answer: string,
  domain: string
): Promise<Pick<AssessmentAnswer, "score" | "confidence" | "evidence" | "rationale" | "feedback">> {
  const prompt = `Evalúa esta respuesta para la competencia "${domain}":

Pregunta: ${question}
Respuesta del colaborador: ${answer}

Proporciona:
- score: puntaje del 0 al 100 (100 = nivel experto)
- confidence: tu nivel de confianza en la evaluación (0.0 a 1.0)
- evidence: array de 1-3 frases clave de la respuesta que justifican el puntaje
- rationale: explicación breve del puntaje (1 oración en español)
- feedback: retroalimentación constructiva de 1-2 oraciones en español

Responde ÚNICAMENTE con JSON válido.`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "answer_evaluation",
          strict: true,
          schema: EVALUATION_SCHEMA,
        },
      },
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");

    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 60)),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      rationale: typeof parsed.rationale === "string" ? parsed.rationale : "Evaluación completada.",
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Respuesta evaluada.",
    };
  } catch {
    return {
      score: 60,
      confidence: 0.5,
      evidence: [],
      rationale: "Evaluación por defecto aplicada.",
      feedback: "Tu respuesta fue registrada correctamente.",
    };
  }
}

// ─── Narrative summary ────────────────────────────────────────────────────────

export async function generateAssessmentSummary(
  userName: string,
  scores: { domain: string; score: number }[]
): Promise<string> {
  const scoresText = scores.map((r) => `${r.domain}: ${r.score}/100`).join(", ");
  const prompt = `Genera un resumen ejecutivo de 3-4 oraciones del perfil de competencias de ${userName} basado en estos puntajes: ${scoresText}. Destaca las 2 principales fortalezas y 1 área de mejora prioritaria. Responde en español, tono profesional y motivador.`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
    });
    const raw = response.choices[0]?.message?.content;
    return typeof raw === "string" ? raw : "Evaluación completada exitosamente.";
  } catch {
    return "Evaluación completada exitosamente.";
  }
}
