import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import {
  getAllUsers,
  getAllOnboardingSessions,
  getAllAssessments,
  getOrCreateOnboarding,
  getOrCreateAssessment,
  updateOnboardingMessages,
  updateOnboardingProfile,
  updateAssessmentQuestions,
  updateAssessmentAnswers,
  getAssessmentByUserId,
  updateUserProfile,
} from "./db";
import type { AssessmentQuestion, AssessmentAnswer, RadarScore, MacroDomain } from "../drizzle/schema";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo Administradores P&C pueden acceder." });
  }
  return next({ ctx });
});

// ─── Constants ────────────────────────────────────────────────────────────────
const MACRO_DOMAINS: MacroDomain[] = [
  "Digital & GenAI",
  "Liderazgo Moderno",
  "Operación Ágil",
  "Customer Experience",
  "Data-driven",
  "Innovación",
];

const EXPECTED_SCORES: Record<MacroDomain, number> = {
  "Digital & GenAI": 70,
  "Liderazgo Moderno": 65,
  "Operación Ágil": 75,
  "Customer Experience": 70,
  "Data-driven": 65,
  "Innovación": 60,
};

// ─── Onboarding system prompt ─────────────────────────────────────────────────
function buildOnboardingSystemPrompt(userName: string, jobTitle?: string | null) {
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

// ─── Assessment system prompt ─────────────────────────────────────────────────
function buildAssessmentSystemPrompt(userName: string, jobTitle?: string | null) {
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
    },
    ...
  ]
}`;
}

// ─── Answer evaluation prompt ─────────────────────────────────────────────────
function buildEvaluationPrompt(question: string, answer: string, domain: string) {
  return `Evalúa esta respuesta para la competencia "${domain}":

Pregunta: ${question}
Respuesta del colaborador: ${answer}

Proporciona:
1. Un puntaje del 0 al 100 (siendo 100 el nivel experto)
2. Un feedback constructivo de 1-2 oraciones en español

Responde ÚNICAMENTE con JSON válido:
{"score": 75, "feedback": "..."}`;
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── User profile ────────────────────────────────────────────────────────
  user: router({
    updateProfile: protectedProcedure
      .input(z.object({ jobTitle: z.string().optional(), department: z.string().optional(), name: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ─── Onboarding ──────────────────────────────────────────────────────────
  onboarding: router({
    getSession: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateOnboarding(ctx.user.id);
    }),

    sendMessage: protectedProcedure
      .input(z.object({ message: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const session = await getOrCreateOnboarding(ctx.user.id);
        const history = (session.messages as { role: string; content: string }[]) ?? [];

        // Add user message
        const updatedHistory = [
          ...history,
          { role: "user", content: input.message },
        ];

        // Call AI
        const systemPrompt = buildOnboardingSystemPrompt(
          ctx.user.name ?? "colaborador",
          ctx.user.jobTitle
        );

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...updatedHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        const assistantContent = typeof rawContent === "string" ? rawContent : "Gracias por tu respuesta.";
        const isComplete = assistantContent.includes("[ONBOARDING_COMPLETE]");
        const cleanContent = assistantContent.replace("[ONBOARDING_COMPLETE]", "").trim();

        const finalHistory = [...updatedHistory, { role: "assistant", content: cleanContent }];
        const newStatus = isComplete ? "completed" : history.length === 0 ? "in_progress" : session.status;

        await updateOnboardingMessages(session.id, finalHistory, newStatus as "pending" | "in_progress" | "completed");

        // If complete, extract profile
        if (isComplete) {
          const profileScores: Record<string, number> = {};
          for (const domain of MACRO_DOMAINS) {
            profileScores[domain] = Math.floor(Math.random() * 30) + 55; // placeholder until real extraction
          }
          await updateOnboardingProfile(session.id, profileScores);
        }

        return { content: cleanContent, isComplete, status: newStatus };
      }),

    reset: protectedProcedure.mutation(async ({ ctx }) => {
      const session = await getOrCreateOnboarding(ctx.user.id);
      await updateOnboardingMessages(session.id, [], "pending");
      return { success: true };
    }),
  }),

  // ─── Assessment (Proof of Skills) ────────────────────────────────────────
  assessment: router({
    getOrCreate: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateAssessment(ctx.user.id);
    }),

    generateQuestions: protectedProcedure.mutation(async ({ ctx }) => {
      const assessment = await getOrCreateAssessment(ctx.user.id);
      if (assessment.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La evaluación ya fue completada." });
      }

      const systemPrompt = buildAssessmentSystemPrompt(
        ctx.user.name ?? "colaborador",
        ctx.user.jobTitle
      );

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

        let questions: AssessmentQuestion[] = [];
      try {
        const rawQ = response.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof rawQ === "string" ? rawQ : "{}");
        questions = parsed.questions ?? [];
      } catch {
        // Fallback questions if AI fails
        questions = MACRO_DOMAINS.map((domain, i) => ({
          id: `q${i + 1}`,
          question: `Describe una situación reciente donde aplicaste competencias de ${domain} en tu trabajo.`,
          macroDomain: domain,
          competencyLayer: "Funcionales" as const,
          type: "open" as const,
        }));
      }

      await updateAssessmentQuestions(assessment.id, questions);
      return { questions };
    }),

    submitAnswers: protectedProcedure
      .input(z.object({ answers: z.array(z.object({ questionId: z.string(), answer: z.string() })) }))
      .mutation(async ({ ctx, input }) => {
        const assessment = await getOrCreateAssessment(ctx.user.id);
        const questions = (assessment.questions as AssessmentQuestion[]) ?? [];

        // Evaluate each answer with AI
        const evaluatedAnswers: AssessmentAnswer[] = [];
        for (const { questionId, answer } of input.answers) {
          const question = questions.find((q) => q.id === questionId);
          if (!question) continue;

          try {
            const evalResponse = await invokeLLM({
              messages: [
                {
                  role: "user",
                  content: buildEvaluationPrompt(question.question, answer, question.macroDomain),
                },
              ],
            });
            const rawEval = evalResponse.choices[0]?.message?.content;
            const parsed = JSON.parse(typeof rawEval === "string" ? rawEval : "{}");
            evaluatedAnswers.push({
              questionId,
              answer,
              score: Math.min(100, Math.max(0, parsed.score ?? 60)),
              feedback: parsed.feedback ?? "Respuesta evaluada.",
            });
          } catch {
            evaluatedAnswers.push({ questionId, answer, score: 60, feedback: "Respuesta registrada." });
          }
        }

        // Build radar scores
        const radarScores: RadarScore[] = MACRO_DOMAINS.map((domain) => {
          const domainAnswer = evaluatedAnswers.find((a) => {
            const q = questions.find((q) => q.id === a.questionId);
            return q?.macroDomain === domain;
          });
          return {
            domain,
            score: domainAnswer?.score ?? 60,
            expected: EXPECTED_SCORES[domain],
          };
        });

        const overallScore =
          radarScores.reduce((sum, r) => sum + r.score, 0) / radarScores.length;

        // Generate narrative summary
        const summaryResponse = await invokeLLM({
          messages: [
            {
              role: "user",
              content: `Genera un resumen ejecutivo de 3-4 oraciones del perfil de competencias de ${ctx.user.name ?? "el colaborador"} basado en estos puntajes: ${radarScores.map((r) => `${r.domain}: ${r.score}/100`).join(", ")}. Destaca las 2 principales fortalezas y 1 área de mejora prioritaria. Responde en español, tono profesional y motivador.`,
            },
          ],
        });

        const rawSummary = summaryResponse.choices[0]?.message?.content;
        const summary = typeof rawSummary === "string" ? rawSummary : "Evaluación completada exitosamente.";

        await updateAssessmentAnswers(assessment.id, evaluatedAnswers, radarScores, overallScore, summary);

        return { radarScores, overallScore, summary, answers: evaluatedAnswers };
      }),

    getResults: protectedProcedure.query(async ({ ctx }) => {
      return getAssessmentByUserId(ctx.user.id);
    }),

    reset: protectedProcedure.mutation(async ({ ctx }) => {
      const assessment = await getOrCreateAssessment(ctx.user.id);
      await updateAssessmentQuestions(assessment.id, []);
      return { success: true };
    }),
  }),

  // ─── Admin / P&C Dashboard ────────────────────────────────────────────────
  admin: router({
    getStats: adminProcedure.query(async () => {
      const [allUsers, allOnboardings, allAssessments] = await Promise.all([
        getAllUsers(),
        getAllOnboardingSessions(),
        getAllAssessments(),
      ]);

      const completedOnboardings = allOnboardings.filter((o) => o.status === "completed").length;
      const completedAssessments = allAssessments.filter((a) => a.status === "completed").length;

      const completedWithScores = allAssessments.filter(
        (a) => a.status === "completed" && a.overallScore != null
      );
      const avgScore =
        completedWithScores.length > 0
          ? completedWithScores.reduce((sum, a) => sum + (a.overallScore ?? 0), 0) /
            completedWithScores.length
          : 0;

      // Aggregate radar scores per domain
      const domainAggregates: Record<string, number[]> = {};
      for (const assessment of completedWithScores) {
        const scores = assessment.radarScores as RadarScore[] | null;
        if (!scores) continue;
        for (const { domain, score } of scores) {
          if (!domainAggregates[domain]) domainAggregates[domain] = [];
          domainAggregates[domain]!.push(score);
        }
      }

      const domainAverages = MACRO_DOMAINS.map((domain) => ({
        domain,
        average: domainAggregates[domain]?.length
          ? domainAggregates[domain]!.reduce((a, b) => a + b, 0) / domainAggregates[domain]!.length
          : 0,
        expected: EXPECTED_SCORES[domain],
      }));

      return {
        totalUsers: allUsers.filter((u) => u.role === "user").length,
        completedOnboardings,
        completedAssessments,
        avgScore: Math.round(avgScore),
        domainAverages,
      };
    }),

    getCollaborators: adminProcedure.query(async () => {
      const [allUsers, allOnboardings, allAssessments] = await Promise.all([
        getAllUsers(),
        getAllOnboardingSessions(),
        getAllAssessments(),
      ]);

      return allUsers
        .filter((u) => u.role === "user")
        .map((user) => {
          const onboarding = allOnboardings.find((o) => o.userId === user.id);
          const assessment = allAssessments.find((a) => a.userId === user.id);
          return {
            ...user,
            onboardingStatus: onboarding?.status ?? "pending",
            assessmentStatus: assessment?.status ?? "pending",
            overallScore: assessment?.overallScore ?? null,
            radarScores: (assessment?.radarScores as RadarScore[] | null) ?? [],
          };
        });
    }),
  }),
});

export type AppRouter = typeof appRouter;
