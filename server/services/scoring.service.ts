/**
 * Scoring Service — deterministic competency scoring engine.
 * Replaces all Math.random() usage with structured AI evaluation.
 */
import {
  MACRO_DOMAINS,
  DEFAULT_EXPECTED_SCORES,
  type MacroDomain,
  type AssessmentAnswer,
  type RadarScore,
  type CompetencyScore,
} from "../../shared/competency";
import { evaluateAnswer } from "./llm.service";
import type { AssessmentQuestion } from "../../shared/competency";

/**
 * Evaluate all answers and build structured competency scores.
 * Each score includes confidence, evidence, and rationale — no random values.
 */
export async function evaluateAllAnswers(
  questions: AssessmentQuestion[],
  rawAnswers: { questionId: string; answer: string }[],
  expectedScores: Record<MacroDomain, number> = DEFAULT_EXPECTED_SCORES
): Promise<{
  answers: AssessmentAnswer[];
  radarScores: RadarScore[];
  competencyScores: CompetencyScore[];
  overallScore: number;
}> {
  const answers: AssessmentAnswer[] = [];

  // Evaluate each answer sequentially to avoid rate limiting
  for (const { questionId, answer } of rawAnswers) {
    const question = questions.find((q) => q.id === questionId);
    if (!question) continue;

    const evaluation = await evaluateAnswer(question.question, answer, question.macroDomain);
    answers.push({ questionId, answer, ...evaluation });
  }

  // Build radar scores — one per macro domain
  const radarScores: RadarScore[] = MACRO_DOMAINS.map((domain) => {
    const domainAnswer = answers.find((a) => {
      const q = questions.find((q) => q.id === a.questionId);
      return q?.macroDomain === domain;
    });
    return {
      domain,
      score: domainAnswer?.score ?? 0,
      expected: expectedScores[domain],
    };
  });

  // Build full competency scores with evidence
  const competencyScores: CompetencyScore[] = MACRO_DOMAINS.map((domain) => {
    const domainAnswer = answers.find((a) => {
      const q = questions.find((q) => q.id === a.questionId);
      return q?.macroDomain === domain;
    });
    return {
      domain,
      score: domainAnswer?.score ?? 0,
      expected: expectedScores[domain],
      confidence: domainAnswer?.confidence ?? 0,
      evidence: domainAnswer?.evidence ?? [],
      rationale: domainAnswer?.rationale ?? "Sin evaluación disponible.",
    };
  });

  // Overall score = weighted average of evaluated domains only
  const evaluatedScores = radarScores.filter((r) => r.score > 0);
  const overallScore =
    evaluatedScores.length > 0
      ? evaluatedScores.reduce((sum, r) => sum + r.score, 0) / evaluatedScores.length
      : 0;

  return { answers, radarScores, competencyScores, overallScore };
}

/**
 * Calculate gap analysis between actual and expected scores.
 * Returns domains sorted by gap severity (most critical first).
 */
export function calculateGapAnalysis(radarScores: RadarScore[]): {
  domain: MacroDomain;
  score: number;
  expected: number;
  gap: number;
  severity: "critical" | "moderate" | "on-track" | "exceeds";
}[] {
  return radarScores
    .map((r) => {
      const gap = r.score - r.expected;
      const severity: "exceeds" | "on-track" | "moderate" | "critical" =
        gap >= 10 ? "exceeds" :
        gap >= -5 ? "on-track" :
        gap >= -20 ? "moderate" : "critical";
      return { domain: r.domain as MacroDomain, score: r.score, expected: r.expected, gap, severity };
    })
    .sort((a, b) => a.gap - b.gap); // most critical first
}
