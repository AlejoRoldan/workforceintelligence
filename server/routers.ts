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

    getCollaborators: adminProcedure.query(async ({ ctx }) => {
      const [allUsers, allOnboardings, allAssessments] = await Promise.all([
        getAllUsers(),
        getAllOnboardingSessions(),
        getAllAssessments(),
      ]);

      auditLog(createAuditEntry(ctx.user.id, ctx.user.name ?? "unknown", "admin.collaborators_viewed", "users"));

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
            radarScores: (assessment?.radarScores ?? []) as RadarScore[],
          };
        });
    }),
  }),
});

export type AppRouter = typeof appRouter;
