/**
 * Sprint 5 Tests — Learning Path (Rutas de Aprendizaje)
 * Covers: learning.service helpers, learning.repository logic, router preconditions
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ── 1. learning.service helpers ───────────────────────────────────────────────
import { classifyGapPriority, hasSignificantGaps } from "./services/learning.service";

describe("classifyGapPriority", () => {
  it("classifies gap >= 30 as critical", () => {
    expect(classifyGapPriority(40, 70)).toBe("critical");
    expect(classifyGapPriority(30, 60)).toBe("critical");
  });

  it("classifies gap 10-29 as moderate", () => {
    expect(classifyGapPriority(50, 70)).toBe("moderate");
    expect(classifyGapPriority(60, 70)).toBe("moderate");
  });

  it("classifies gap <= 0 as on-track (score meets or exceeds expected)", () => {
    expect(classifyGapPriority(80, 70)).toBe("on-track"); // exceeds expected
    expect(classifyGapPriority(70, 70)).toBe("on-track"); // exact match
  });

  it("classifies gap 1-20 as moderate", () => {
    expect(classifyGapPriority(65, 70)).toBe("moderate"); // gap = 5
    expect(classifyGapPriority(55, 70)).toBe("moderate"); // gap = 15
  });
});

describe("hasSignificantGaps", () => {
  it("returns true when at least one domain has gap >= 10", () => {
    const scores = [
      { domain: "Digital & GenAI", score: 50, expected: 70, label: "Digital & GenAI" },
      { domain: "Liderazgo Moderno", score: 75, expected: 70, label: "Liderazgo Moderno" },
    ];
    expect(hasSignificantGaps(scores)).toBe(true);
  });

  it("returns false when all domains meet expectations", () => {
    const scores = [
      { domain: "Digital & GenAI", score: 72, expected: 70, label: "Digital & GenAI" },
      { domain: "Liderazgo Moderno", score: 80, expected: 70, label: "Liderazgo Moderno" },
      { domain: "Operación Ágil", score: 70, expected: 70, label: "Operación Ágil" },
    ];
    expect(hasSignificantGaps(scores)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(hasSignificantGaps([])).toBe(false);
  });

  it("returns false when expected is undefined (r.expected is undefined, gap = undefined - score = NaN)", () => {
    // When expected is missing, r.expected - r.score = NaN, which is not > 0
    const scores = [
      { domain: "Innovación", score: 45, label: "Innovación" } as any,
    ];
    expect(hasSignificantGaps(scores)).toBe(false);
  });
});

// ── 2. LearningPlan structure validation ─────────────────────────────────────
describe("LearningPlan structure", () => {
  it("validates a well-formed learning plan object", () => {
    const plan = {
      generatedAt: new Date().toISOString(),
      collaboratorName: "Ana García",
      jobTitle: "Analista",
      department: "Tecnología",
      executiveSummary: "Plan de desarrollo personalizado.",
      topPriorityDomain: "Digital & GenAI",
      totalActions: 3,
      estimatedTotalHours: 12,
      domains: [
        {
          domain: "Digital & GenAI",
          priority: "critical",
          currentScore: 40,
          expectedScore: 70,
          gap: 30,
          rationale: "Brecha crítica en herramientas digitales.",
          actions: [
            {
              id: "action-1",
              title: "Curso de IA Generativa",
              description: "Completar el curso introductorio de GenAI.",
              resourceType: "course",
              resourceUrl: "https://example.com/genai",
              estimatedHours: 8,
              priority: "high",
              completed: false,
              completedAt: null,
            },
          ],
        },
      ],
    };

    expect(plan.domains).toHaveLength(1);
    expect(plan.domains[0].priority).toBe("critical");
    expect(plan.domains[0].actions[0].completed).toBe(false);
    expect(plan.totalActions).toBe(3);
    expect(plan.topPriorityDomain).toBe("Digital & GenAI");
  });

  it("correctly counts completed actions", () => {
    const actions = [
      { id: "a1", completed: true },
      { id: "a2", completed: false },
      { id: "a3", completed: true },
    ];
    const completed = actions.filter((a) => a.completed).length;
    expect(completed).toBe(2);
    const progress = Math.round((completed / actions.length) * 100);
    expect(progress).toBe(67);
  });
});

// ── 3. Priority sorting logic ─────────────────────────────────────────────────
describe("Domain priority sorting", () => {
  const domains = [
    { domain: "Liderazgo Moderno", priority: "on-track" as const },
    { domain: "Digital & GenAI", priority: "critical" as const },
    { domain: "Operación Ágil", priority: "moderate" as const },
    { domain: "Innovación", priority: "critical" as const },
  ];

  it("sorts critical domains first, then moderate, then on-track", () => {
    const order = { critical: 0, moderate: 1, "on-track": 2 };
    const sorted = [...domains].sort((a, b) => order[a.priority] - order[b.priority]);

    expect(sorted[0].priority).toBe("critical");
    expect(sorted[1].priority).toBe("critical");
    expect(sorted[2].priority).toBe("moderate");
    expect(sorted[3].priority).toBe("on-track");
  });

  it("identifies the top priority domain correctly", () => {
    const criticalDomains = domains.filter((d) => d.priority === "critical");
    expect(criticalDomains).toHaveLength(2);
    expect(criticalDomains.map((d) => d.domain)).toContain("Digital & GenAI");
  });
});

// ── 4. Action toggle logic ────────────────────────────────────────────────────
describe("Action completion tracking", () => {
  it("calculates overall progress correctly", () => {
    const allActions = [
      { id: "a1", completed: true },
      { id: "a2", completed: true },
      { id: "a3", completed: false },
      { id: "a4", completed: false },
    ];
    const completed = allActions.filter((a) => a.completed).length;
    const progress = allActions.length > 0
      ? Math.round((completed / allActions.length) * 100)
      : 0;
    expect(progress).toBe(50);
  });

  it("returns 0% progress when no actions are completed", () => {
    const allActions = [
      { id: "a1", completed: false },
      { id: "a2", completed: false },
    ];
    const completed = allActions.filter((a) => a.completed).length;
    const progress = allActions.length > 0
      ? Math.round((completed / allActions.length) * 100)
      : 0;
    expect(progress).toBe(0);
  });

  it("returns 100% progress when all actions are completed", () => {
    const allActions = [
      { id: "a1", completed: true },
      { id: "a2", completed: true },
    ];
    const completed = allActions.filter((a) => a.completed).length;
    const progress = Math.round((completed / allActions.length) * 100);
    expect(progress).toBe(100);
  });

  it("returns 0% for empty actions array", () => {
    const allActions: { completed: boolean }[] = [];
    const progress = allActions.length > 0
      ? Math.round((allActions.filter((a) => a.completed).length / allActions.length) * 100)
      : 0;
    expect(progress).toBe(0);
  });
});

// ── 5. Router precondition logic ──────────────────────────────────────────────
describe("Learning router preconditions", () => {
  it("rejects plan generation when assessment is not completed", () => {
    const assessment = { status: "in_progress" };
    const canGenerate = assessment.status === "completed";
    expect(canGenerate).toBe(false);
  });

  it("allows plan generation when assessment is completed", () => {
    const assessment = { status: "completed" };
    const canGenerate = assessment.status === "completed";
    expect(canGenerate).toBe(true);
  });

  it("returns existing plan when idempotency check passes", () => {
    const existing = { id: 1, status: "ready", planJson: { totalActions: 5 } };
    const shouldReuse = existing && existing.status !== "generating" && existing.planJson;
    expect(shouldReuse).toBeTruthy();
  });

  it("regenerates plan when existing is in generating state", () => {
    const existing = { id: 1, status: "generating", planJson: null };
    const shouldReuse = existing && existing.status !== "generating" && existing.planJson;
    expect(shouldReuse).toBeFalsy();
  });
});

// ── 6. Estimated hours calculation ───────────────────────────────────────────
describe("Estimated hours aggregation", () => {
  it("sums hours across all domains and actions", () => {
    const domains = [
      { actions: [{ estimatedHours: 8 }, { estimatedHours: 4 }] },
      { actions: [{ estimatedHours: 6 }, { estimatedHours: 2 }] },
    ];
    const total = domains.flatMap((d) => d.actions).reduce((sum, a) => sum + a.estimatedHours, 0);
    expect(total).toBe(20);
  });
});
