/**
 * Shared competency framework constants and types.
 * Single source of truth for domains, layers, and scoring structures.
 */

export const MACRO_DOMAINS = [
  "Digital & GenAI",
  "Liderazgo Moderno",
  "Operación Ágil",
  "Customer Experience",
  "Data-driven",
  "Innovación",
] as const;

export type MacroDomain = (typeof MACRO_DOMAINS)[number];

export const COMPETENCY_LAYERS = [
  "Organizacionales",
  "Liderazgo",
  "Funcionales",
  "Estratégicas Futuras",
] as const;

export type CompetencyLayer = (typeof COMPETENCY_LAYERS)[number];

/** Default expected score per domain (configurable per role in future sprints) */
export const DEFAULT_EXPECTED_SCORES: Record<MacroDomain, number> = {
  "Digital & GenAI": 70,
  "Liderazgo Moderno": 65,
  "Operación Ágil": 75,
  "Customer Experience": 70,
  "Data-driven": 65,
  "Innovación": 60,
};

/** Structured competency score with evidence — replaces Math.random() */
export interface CompetencyScore {
  domain: MacroDomain;
  score: number;        // 0–100
  expected: number;     // expected level for role
  confidence: number;   // 0–1, AI confidence in this score
  evidence: string[];   // key phrases from the answer that justify the score
  rationale: string;    // brief explanation of the score
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  macroDomain: MacroDomain;
  competencyLayer: CompetencyLayer;
  type: "open";
}

export interface AssessmentAnswer {
  questionId: string;
  answer: string;
  score: number;
  confidence: number;
  evidence: string[];
  rationale: string;
  feedback: string;
}

export interface RadarScore {
  domain: MacroDomain;
  score: number;
  expected: number;
}
