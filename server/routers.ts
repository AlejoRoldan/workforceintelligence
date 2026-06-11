/**
 * App Router — tRPC procedure definitions.
 * Sprint 1 refactor: routers now delegate to services and repositories.
 * Business logic lives in services/; data access in repositories/.
 */
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";

// ─── Repositories ─────────────────────────────────────────────────────────────
import {
  findOrCreateOnboarding,
  saveOnboardingMessages,
  saveOnboardingProfile,
  resetOnboarding,
  getAllOnboardingSessions,
} from "./repositories/onboarding.repository";
import {
  findOrCreateAssessment,
  saveAssessmentQuestions,
  saveAssessmentResults,
  resetAssessment,
  getAssessmentByUserId,
  getAllAssessments,
} from "./repositories/assessment.repository";
import { getAllUsers, updateUserProfile } from "./repositories/user.repository";

// ─── Services ─────────────────────────────────────────────────────────────────
import {
  buildOnboardingSystemPrompt,
  invokeOnboardingChat,
  generateAssessmentQuestions,
  generateAssessmentSummary,
  extractProfileFromConversation,
} from "./services/llm.service";
import { evaluateAllAnswers } from "./services/scoring.service";
import {
  getExpectationsForRole,
  normalizeRole,
  getDomainByName,
  saveEvidence,
} from "./repositories/competency.repository";
import { auditLog, createAuditEntry } from "./services/audit.service";
import {
  getUnreadNotifications,
  getAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./repositories/notifications.repository";

// ─── Permissions ──────────────────────────────────────────────────────────────
import { adminProcedure } from "./middleware/permissions";

// ─── Shared types ─────────────────────────────────────────────────────────────
import { MACRO_DOMAINS, DEFAULT_EXPECTED_SCORES, type RadarScore } from "../shared/competency";

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      if (ctx.user) {
        auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "auth.logout", "session"));
      }
      return { success: true } as const;
    }),
  }),

  // ─── User profile ───────────────────────────────────────────────────────────
  user: router({
    updateProfile: protectedProcedure
      .input(
        z.object({
          jobTitle: z.string().max(128).optional(),
          department: z.string().max(128).optional(),
          name: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "user.profile_updated", "user", ctx.user.id));
        return { success: true };
      }),
  }),

  // ─── Onboarding ─────────────────────────────────────────────────────────────
  onboarding: router({
    getSession: protectedProcedure.query(async ({ ctx }) => {
      return findOrCreateOnboarding(ctx.user.id);
    }),

    sendMessage: protectedProcedure
      .input(z.object({ message: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const session = await findOrCreateOnboarding(ctx.user.id);
        const history = session.messages;

        const updatedHistory = [...history, { role: "user", content: input.message }];

        const systemPrompt = buildOnboardingSystemPrompt(
          ctx.user.name ?? "colaborador",
          ctx.user.jobTitle
        );

        const assistantContent = await invokeOnboardingChat(systemPrompt, updatedHistory);
        const isComplete = assistantContent.includes("[ONBOARDING_COMPLETE]");
        const cleanContent = assistantContent.replace("[ONBOARDING_COMPLETE]", "").trim();

        const finalHistory = [...updatedHistory, { role: "assistant", content: cleanContent }];
        const newStatus =
          isComplete ? "completed" :
          history.length === 0 ? "in_progress" :
          session.status;

        await saveOnboardingMessages(session.id, finalHistory, newStatus);

        if (isComplete) {
          // Sprint 2: Extract real profile from conversation using AI structured output
          const profileScores = await extractProfileFromConversation(finalHistory);
          await saveOnboardingProfile(session.id, profileScores);
          auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "onboarding.completed", "onboarding_session", session.id));
          // Sprint A: Notify admins
          const { notifyOnboardingCompleted } = await import("./services/notifications.service");
          notifyOnboardingCompleted(ctx.user.id, ctx.user.name ?? "Colaborador").catch(() => {});
        } else if (history.length === 0) {
          auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "onboarding.started", "onboarding_session", session.id));
        }

        return { content: cleanContent, isComplete, status: newStatus };
      }),

    reset: protectedProcedure.mutation(async ({ ctx }) => {
      const session = await findOrCreateOnboarding(ctx.user.id);
      await resetOnboarding(session.id);
      auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "onboarding.reset", "onboarding_session", session.id));
      return { success: true };
    }),
  }),

  // ─── Assessment (Proof of Skills) ───────────────────────────────────────────
  assessment: router({
    getOrCreate: protectedProcedure.query(async ({ ctx }) => {
      return findOrCreateAssessment(ctx.user.id);
    }),

    generateQuestions: protectedProcedure.mutation(async ({ ctx }) => {
      const assessment = await findOrCreateAssessment(ctx.user.id);
      if (assessment.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La evaluación ya fue completada." });
      }

      const questions = await generateAssessmentQuestions(
        ctx.user.name ?? "colaborador",
        ctx.user.jobTitle
      );

      await saveAssessmentQuestions(assessment.id, questions);
      auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "assessment.questions_generated", "assessment", assessment.id));
      return { questions };
    }),

    submitAnswers: protectedProcedure
      .input(
        z.object({
          answers: z.array(
            z.object({
              questionId: z.string(),
              answer: z.string().min(1).max(5000),
            })
          ).min(1).max(6),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const assessment = await findOrCreateAssessment(ctx.user.id);
        if (assessment.status === "completed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "La evaluación ya fue completada." });
        }

        // Sprint 2: Load role-specific expectations from DB instead of static defaults
        const jobTitle = ctx.user.jobTitle ?? "Default";
        const dbExpectations = await getExpectationsForRole(jobTitle);

        // Build expected scores map from DB; fall back to DEFAULT_EXPECTED_SCORES
        const expectedScores: Record<string, number> = { ...DEFAULT_EXPECTED_SCORES };
        if (dbExpectations.length > 0) {
          // We need domain names — load all domains once
          const { getAllDomains } = await import("./repositories/competency.repository");
          const domains = await getAllDomains();
          const domainMap = new Map(domains.map((d) => [d.id, d.name]));
          for (const exp of dbExpectations) {
            const domainName = domainMap.get(exp.domainId);
            if (domainName) expectedScores[domainName] = exp.expectedScore;
          }
        }

        const { answers, radarScores, overallScore } = await evaluateAllAnswers(
          assessment.questions,
          input.answers,
          expectedScores
        );

        const summary = await generateAssessmentSummary(
          ctx.user.name ?? "el colaborador",
          radarScores.map((r) => ({ domain: r.domain, score: r.score }))
        );

        await saveAssessmentResults(assessment.id, answers, radarScores, overallScore, summary);

        // Sprint 2: Persist competency evidence per answer for audit trail
        const { getAllDomains: getDomains } = await import("./repositories/competency.repository");
        const allDomains = await getDomains();
        const domainIdMap = new Map(allDomains.map((d) => [d.name, d.id]));
        for (const ans of answers) {
          const question = assessment.questions?.find((q) => q.id === ans.questionId);
          if (!question) continue;
          const domainId = domainIdMap.get(question.macroDomain);
          if (!domainId) continue;
          await saveEvidence({
            assessmentId: assessment.id,
            domainId,
            questionId: ans.questionId,
            evidence: ans.evidence,
            confidence: ans.confidence,
            rationale: ans.rationale,
            score: ans.score,
          });
        }

        auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "assessment.submitted", "assessment", assessment.id, { overallScore }));
        // Sprint A: Notify admins
        const { notifyAssessmentCompleted } = await import("./services/notifications.service");
        notifyAssessmentCompleted(ctx.user.id, ctx.user.name ?? "Colaborador", overallScore).catch(() => {});

        return { radarScores, overallScore, summary, answers };
      }),

    getResults: protectedProcedure.query(async ({ ctx }) => {
      return getAssessmentByUserId(ctx.user.id);
    }),

    reset: protectedProcedure.mutation(async ({ ctx }) => {
      const assessment = await findOrCreateAssessment(ctx.user.id);
      await resetAssessment(assessment.id);
      auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "assessment.reset", "assessment", assessment.id));
      return { success: true };
    }),
  }),

  // ─── Learning Paths ───────────────────────────────────────────────────────────────
  learning: router({
    // Generates a personalized learning plan post-assessment.
    // Idempotent: if a plan already exists for this assessment, returns it.
    generate: protectedProcedure.mutation(async ({ ctx }) => {
      const {
        getLearningPlanByUserAndAssessment,
        createLearningPlan,
        saveLearningPlan,
      } = await import("./repositories/learning.repository");
      const { generateLearningPlan, hasSignificantGaps } = await import("./services/learning.service");
      const { getExpectationsForRole, normalizeRole: nr } = await import("./repositories/competency.repository");

      const assessment = await getAssessmentByUserId(ctx.user.id);
      if (!assessment || assessment.status !== "completed") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Debes completar la evaluación antes de generar tu ruta de aprendizaje." });
      }

      // Idempotency: return existing plan if already generated
      const existing = await getLearningPlanByUserAndAssessment(ctx.user.id, assessment.id);
      if (existing && existing.status !== "generating" && existing.planJson) {
        return existing.planJson;
      }

      const radarScores = (assessment.radarScores ?? []) as RadarScore[];
      if (!hasSignificantGaps(radarScores)) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Tu perfil ya cumple todas las expectativas del rol. ¡Excelente trabajo!" });
      }

      // Enrich radar scores with role expectations (domainId → domainName join)
      const role = nr(ctx.user.jobTitle ?? "");
      const expectations = await getExpectationsForRole(role);
      const { getAllDomains } = await import("./repositories/competency.repository");
      const allDomainsForPlan = await getAllDomains();
      const domainIdToName = new Map(allDomainsForPlan.map((d) => [d.id, d.name]));
      const enrichedScores = radarScores.map((r) => {
        const exp = expectations.find((e) => domainIdToName.get(e.domainId) === r.domain);
        return { ...r, expected: exp?.expectedScore ?? r.expected ?? 70 };
      });

      // Create placeholder row
      const planId = existing?.id ?? await createLearningPlan(ctx.user.id, assessment.id);

      // Generate plan with AI
      const plan = await generateLearningPlan({
        collaboratorName: ctx.user.name ?? "Colaborador",
        jobTitle: ctx.user.jobTitle ?? "Colaborador",
        department: ctx.user.department ?? "General",
        radarScores: enrichedScores,
        assessmentSummary: assessment.summary ?? "",
      });

      await saveLearningPlan(planId, plan);

      auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "assessment.submitted", "learning_plan", planId));

      return plan;
    }),

    // Returns the collaborator's current learning plan.
    getMyPlan: protectedProcedure.query(async ({ ctx }) => {
      const { getLearningPlanByUserId } = await import("./repositories/learning.repository");
      const row = await getLearningPlanByUserId(ctx.user.id);
      if (!row) return null;
      return { id: row.id, status: row.status, plan: row.planJson as import("../drizzle/schema").LearningPlan | null, generatedAt: row.generatedAt };
    }),

    // Marks a specific action as completed/uncompleted.
    updateActionStatus: protectedProcedure
      .input(z.object({
        planId: z.number(),
        domainName: z.string(),
        actionId: z.string(),
        completed: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { markActionCompleted, getLearningPlanById } = await import("./repositories/learning.repository");

        // Verify ownership
        const row = await getLearningPlanById(input.planId);
        if (!row || row.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para modificar este plan." });
        }

        const updatedPlan = await markActionCompleted(input.planId, input.domainName, input.actionId, input.completed);
        if (!updatedPlan) throw new TRPCError({ code: "NOT_FOUND", message: "Acción no encontrada." });

        auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "user.profile_updated", "learning_action", input.planId, { actionId: input.actionId, completed: input.completed }));

        return updatedPlan;
      }),

    // Admin: get learning plan for a specific collaborator
    getCollaboratorPlan: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx: _ctx, input }) => {
        const { getLearningPlanByUserId } = await import("./repositories/learning.repository");
        const row = await getLearningPlanByUserId(input.userId);
        if (!row) return null;
        return { id: row.id, status: row.status, plan: row.planJson as import("../drizzle/schema").LearningPlan | null, generatedAt: row.generatedAt };
      }),
  }),

  // ─── Admin / P&C Dashboard ──────────────────────────────────────────────────
  admin: router({
    getStats: adminProcedure.query(async ({ ctx }) => {
      const [allUsers, allOnboardings, allAssessments] = await Promise.all([
        getAllUsers(),
        getAllOnboardingSessions(),
        getAllAssessments(),
      ]);

      auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "admin.stats_viewed", "dashboard"));

      const completedOnboardings = allOnboardings.filter((o) => o.status === "completed").length;
      const completedAssessments = allAssessments.filter((a) => a.status === "completed").length;

      const completedWithScores = allAssessments.filter(
        (a) => a.status === "completed" && a.overallScore != null
      );
      const avgScore =
        completedWithScores.length > 0
          ? completedWithScores.reduce((sum, a) => sum + (a.overallScore ?? 0), 0) / completedWithScores.length
          : 0;

      const domainAggregates: Record<string, number[]> = {};
      for (const assessment of completedWithScores) {
        for (const { domain, score } of assessment.radarScores) {
          if (!domainAggregates[domain]) domainAggregates[domain] = [];
          domainAggregates[domain]!.push(score);
        }
      }

      const domainAverages = MACRO_DOMAINS.map((domain) => ({
        domain,
        average: domainAggregates[domain]?.length
          ? domainAggregates[domain]!.reduce((a, b) => a + b, 0) / domainAggregates[domain]!.length
          : 0,
        expected: DEFAULT_EXPECTED_SCORES[domain],
      }));

      return {
        totalUsers: allUsers.filter((u) => u.role === "user").length,
        completedOnboardings,
        completedAssessments,
        avgScore: Math.round(avgScore),
        domainAverages,
      };
    }),

    getCollaborators: adminProcedure
      .input(
        z.object({
          search: z.string().optional(),
          department: z.string().optional(),
          assessmentStatus: z.enum(["all", "pending", "in_progress", "completed"]).optional(),
          onboardingStatus: z.enum(["all", "pending", "in_progress", "completed"]).optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const [allUsers, allOnboardings, allAssessments] = await Promise.all([
          getAllUsers(),
          getAllOnboardingSessions(),
          getAllAssessments(),
        ]);

        auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "admin.collaborators_viewed", "users"));

        let collaborators = allUsers
          .filter((u) => u.role === "user")
          .map((user) => {
            const onboarding = allOnboardings.find((o) => o.userId === user.id);
            const assessment = allAssessments.find((a) => a.userId === user.id);
            return {
              ...user,
              onboardingStatus: onboarding?.status ?? "pending",
              assessmentStatus: assessment?.status ?? "pending",
              overallScore: assessment?.overallScore ?? null,
              radarScores: (assessment?.radarScores ?? []) as RadarScore[],
              completedAt: assessment?.completedAt ?? null,
            };
          });

        // Apply filters
        if (input?.search) {
          const q = input.search.toLowerCase();
          collaborators = collaborators.filter(
            (c) =>
              c.name?.toLowerCase().includes(q) ||
              c.email?.toLowerCase().includes(q) ||
              c.jobTitle?.toLowerCase().includes(q) ||
              c.department?.toLowerCase().includes(q)
          );
        }
        if (input?.department && input.department !== "all") {
          collaborators = collaborators.filter((c) => c.department === input.department);
        }
        if (input?.assessmentStatus && input.assessmentStatus !== "all") {
          collaborators = collaborators.filter((c) => c.assessmentStatus === input.assessmentStatus);
        }
        if (input?.onboardingStatus && input.onboardingStatus !== "all") {
          collaborators = collaborators.filter((c) => c.onboardingStatus === input.onboardingStatus);
        }

        return collaborators;
      }),

    getCollaboratorDetail: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { findUserById } = await import("./repositories/user.repository");
        const { getOnboardingByUserId } = await import("./repositories/onboarding.repository");
        const { getEvidenceByAssessment } = await import("./repositories/competency.repository");

        const [user, onboarding, assessment] = await Promise.all([
          findUserById(input.userId),
          getOnboardingByUserId(input.userId),
          getAssessmentByUserId(input.userId),
        ]);

        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador no encontrado" });

        auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "admin.collaborator_detail_viewed", String(input.userId)));

        // Get evidence for this assessment
        let evidence: Awaited<ReturnType<typeof getEvidenceByAssessment>> = [];
        if (assessment) {
          evidence = await getEvidenceByAssessment(assessment.id);
        }

        return {
          user,
          onboarding: onboarding ? {
            status: onboarding.status,
            profile: onboarding.competencyProfile,
            messageCount: (onboarding.messages as unknown[])?.length ?? 0,
            completedAt: onboarding.completedAt,
            startedAt: onboarding.createdAt,
            lastUpdatedAt: onboarding.updatedAt,
          } : null,
          assessment: assessment ? {
            status: assessment.status,
            overallScore: assessment.overallScore,
            radarScores: assessment.radarScores as RadarScore[],
            summary: assessment.summary,
            completedAt: assessment.completedAt,
            startedAt: assessment.createdAt,
            lastUpdatedAt: assessment.updatedAt,
            questionCount: assessment.questions.length,
            answeredCount: assessment.answers.length,
          } : null,
          evidence,
          // Timeline: ordered list of key events for the collaborator
          timeline: [
            onboarding ? {
              type: "onboarding_started" as const,
              label: "Onboarding iniciado",
              date: onboarding.createdAt,
              status: onboarding.status,
            } : null,
            onboarding?.completedAt ? {
              type: "onboarding_completed" as const,
              label: "Onboarding completado",
              date: onboarding.completedAt,
              status: "completed" as const,
            } : null,
            assessment ? {
              type: "assessment_started" as const,
              label: "Evaluación iniciada",
              date: assessment.createdAt,
              status: assessment.status,
            } : null,
            assessment?.completedAt ? {
              type: "assessment_completed" as const,
              label: `Evaluación completada — Puntaje: ${Math.round(assessment.overallScore ?? 0)}/100`,
              date: assessment.completedAt,
              status: "completed" as const,
            } : null,
          ].filter(Boolean),
        };
      }),

    getCollaboratorPlan: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getLearningPlanByUserId } = await import("./repositories/learning.repository");
        const plan = await getLearningPlanByUserId(input.userId);
        if (!plan) return null;
        auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "admin.collaborator_detail_viewed", `learning_plan:${input.userId}`));
        return {
          id: plan.id,
          status: plan.status,
          generatedAt: plan.generatedAt,
          plan: plan.planJson,
        };
      }),

    getDepartments: adminProcedure.query(async () => {
      const allUsers = await getAllUsers();
      const departments = Array.from(new Set(
        allUsers
          .filter((u) => u.role === "user" && u.department)
          .map((u) => u.department!)
      )).sort();
      return departments;
    }),

    getTeamComparison: adminProcedure
      .input(z.object({ department: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const allUsers = await getAllUsers();
        const collaborators = allUsers.filter((u) =>
          u.role === "user" &&
          (input.department ? u.department === input.department : true)
        );

        const assessments = await getAllAssessments();
        const assessmentMap = new Map(assessments.map((a) => [a.userId, a]));

        const { getAllOnboardingSessions } = await import("./repositories/onboarding.repository");
        const onboardings = await getAllOnboardingSessions();
        const onboardingMap = new Map(onboardings.map((o) => [o.userId, o]));

        auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "admin.team_comparison_viewed", `department:${input.department ?? "all"}`));

        return collaborators.map((u) => {
          const assessment = assessmentMap.get(u.id);
          const onboarding = onboardingMap.get(u.id);
          return {
            id: u.id,
            name: u.name ?? "Sin nombre",
            jobTitle: u.jobTitle ?? "Sin cargo",
            department: u.department ?? "Sin área",
            onboardingStatus: onboarding?.status ?? "pending",
            assessmentStatus: assessment?.status ?? "pending",
            overallScore: assessment?.overallScore ?? null,
            radarScores: (assessment?.radarScores ?? []) as Array<{ domain: string; score: number; expected: number }>,
          };
        });
      }),
    }),

  // ─── Notifications ────────────────────────────────────────────────────────────────────────────
  notifications: router({
    /** Get unread count + list for the current admin user */
    getUnread: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") return { count: 0, items: [] };
      const items = await getUnreadNotifications(ctx.user.id);
      return { count: items.length, items };
    }),

    /** Get all notifications (read + unread) for the current admin user */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") return [];
      return getAllNotifications(ctx.user.id);
    }),

    /** Mark a single notification as read */
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Mark all notifications as read */
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),
});
export type AppRouter = typeof appRouter;
