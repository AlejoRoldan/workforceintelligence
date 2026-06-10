/**
 * Sprint 4 Tests — Dashboard P&C enriquecido
 * Covers: CSV generation, filter logic, collaborator detail, audit actions
 */
import { describe, it, expect } from "vitest";
import { MACRO_DOMAINS } from "../shared/competency";

// ── CSV generation helpers ────────────────────────────────────────────────────

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSVRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCSV).join(",");
}

describe("CSV escaping", () => {
  it("returns empty string for null/undefined", () => {
    expect(escapeCSV(null)).toBe("");
    expect(escapeCSV(undefined)).toBe("");
  });

  it("passes through simple strings without quoting", () => {
    expect(escapeCSV("Alejo Roldan")).toBe("Alejo Roldan");
    expect(escapeCSV(42)).toBe("42");
  });

  it("wraps strings containing commas in double quotes", () => {
    expect(escapeCSV("Roldan, Alejo")).toBe('"Roldan, Alejo"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(escapeCSV('He said "hello"')).toBe('"He said ""hello"""');
  });

  it("wraps strings containing newlines", () => {
    expect(escapeCSV("line1\nline2")).toBe('"line1\nline2"');
  });

  it("builds a full CSV row correctly", () => {
    const row = buildCSVRow([1, "Alejo Roldan", "alejo@itti.com.py", "Gerente P&C", null]);
    expect(row).toBe('1,Alejo Roldan,alejo@itti.com.py,Gerente P&C,');
  });
});

// ── CSV header structure ──────────────────────────────────────────────────────

describe("CSV header structure", () => {
  const domainHeaders = MACRO_DOMAINS.map((d) => `Score_${d.replace(/[&\s]/g, "_")}`);
  const headers = [
    "ID", "Nombre", "Email", "Cargo", "Departamento", "Rol", "Fecha_Registro",
    "Onboarding_Estado", "Onboarding_Completado",
    "Evaluacion_Estado", "Evaluacion_Completado",
    "Puntaje_General",
    ...domainHeaders,
    "Resumen_AI",
  ];

  it("has the correct number of columns (12 fixed + 6 domains + 1 summary)", () => {
    expect(headers.length).toBe(12 + 6 + 1);
  });

  it("includes all 6 macro domain score columns", () => {
    expect(domainHeaders).toHaveLength(6);
    expect(domainHeaders).toContain("Score_Digital___GenAI");
    expect(domainHeaders).toContain("Score_Liderazgo_Moderno");
    expect(domainHeaders).toContain("Score_Operación_Ágil");
    expect(domainHeaders).toContain("Score_Customer_Experience");
    expect(domainHeaders).toContain("Score_Data-driven");
    expect(domainHeaders).toContain("Score_Innovación");
  });

  it("starts with ID and ends with Resumen_AI", () => {
    expect(headers[0]).toBe("ID");
    expect(headers[headers.length - 1]).toBe("Resumen_AI");
  });
});

// ── Client-side filter logic ──────────────────────────────────────────────────

type MockCollaborator = {
  id: number;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  assessmentStatus: string;
  onboardingStatus: string;
  overallScore: number | null;
};

const MOCK_COLLABORATORS: MockCollaborator[] = [
  { id: 1, name: "Ana García", email: "ana@itti.com.py", jobTitle: "Analista", department: "Tecnología", assessmentStatus: "completed", onboardingStatus: "completed", overallScore: 82 },
  { id: 2, name: "Carlos López", email: "carlos@itti.com.py", jobTitle: "Gerente", department: "Comercial", assessmentStatus: "pending", onboardingStatus: "in_progress", overallScore: null },
  { id: 3, name: "María Torres", email: "maria@itti.com.py", jobTitle: "Líder", department: "Tecnología", assessmentStatus: "in_progress", onboardingStatus: "completed", overallScore: null },
  { id: 4, name: "Pedro Ruiz", email: "pedro@itti.com.py", jobTitle: "Analista", department: "Finanzas", assessmentStatus: "completed", onboardingStatus: "completed", overallScore: 65 },
];

function applyFilters(
  list: MockCollaborator[],
  search: string,
  dept: string,
  assessStatus: string,
  onbStatus: string
): MockCollaborator[] {
  let result = list;
  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.jobTitle.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
    );
  }
  if (dept !== "all") result = result.filter((c) => c.department === dept);
  if (assessStatus !== "all") result = result.filter((c) => c.assessmentStatus === assessStatus);
  if (onbStatus !== "all") result = result.filter((c) => c.onboardingStatus === onbStatus);
  return result;
}

describe("Client-side collaborator filters", () => {
  it("returns all collaborators when no filters applied", () => {
    const result = applyFilters(MOCK_COLLABORATORS, "", "all", "all", "all");
    expect(result).toHaveLength(4);
  });

  it("filters by name search (case-insensitive)", () => {
    // "torres" matches only María Torres by name
    const result = applyFilters(MOCK_COLLABORATORS, "torres", "all", "all", "all");
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("María Torres");
  });

  it("filters by department", () => {
    const result = applyFilters(MOCK_COLLABORATORS, "", "Tecnología", "all", "all");
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.department === "Tecnología")).toBe(true);
  });

  it("filters by assessment status", () => {
    const result = applyFilters(MOCK_COLLABORATORS, "", "all", "completed", "all");
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.assessmentStatus === "completed")).toBe(true);
  });

  it("filters by onboarding status", () => {
    const result = applyFilters(MOCK_COLLABORATORS, "", "all", "all", "in_progress");
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Carlos López");
  });

  it("combines multiple filters correctly", () => {
    const result = applyFilters(MOCK_COLLABORATORS, "", "Tecnología", "completed", "all");
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Ana García");
  });

  it("returns empty array when no match", () => {
    const result = applyFilters(MOCK_COLLABORATORS, "xyz_no_existe", "all", "all", "all");
    expect(result).toHaveLength(0);
  });

  it("filters by job title via search", () => {
    const result = applyFilters(MOCK_COLLABORATORS, "gerente", "all", "all", "all");
    expect(result).toHaveLength(1);
    expect(result[0]!.jobTitle).toBe("Gerente");
  });
});

// ── Score display logic ───────────────────────────────────────────────────────

describe("Score color classification", () => {
  function getScoreColor(score: number): string {
    if (score >= 70) return "emerald";
    if (score >= 50) return "amber";
    return "rose";
  }

  it("scores >= 70 are emerald (strong)", () => {
    expect(getScoreColor(82)).toBe("emerald");
    expect(getScoreColor(70)).toBe("emerald");
  });

  it("scores 50-69 are amber (moderate)", () => {
    expect(getScoreColor(65)).toBe("amber");
    expect(getScoreColor(50)).toBe("amber");
  });

  it("scores < 50 are rose (critical)", () => {
    expect(getScoreColor(49)).toBe("rose");
    expect(getScoreColor(0)).toBe("rose");
  });
});

// ── Audit action types ────────────────────────────────────────────────────────

import { createAuditEntry } from "./services/audit.service";

describe("Audit entries for Sprint 4 actions", () => {
  it("creates admin.collaborator_detail_viewed audit entry", () => {
    const entry = createAuditEntry(1, "Admin", "admin.collaborator_detail_viewed", "users", 42);
    expect(entry.action).toBe("admin.collaborator_detail_viewed");
    expect(entry.entityId).toBe(42);
  });

  it("creates admin.csv_exported audit entry", () => {
    const entry = createAuditEntry(1, "Admin", "admin.csv_exported", "export");
    expect(entry.action).toBe("admin.csv_exported");
    expect(entry.entity).toBe("export");
  });

  it("audit entry has required fields", () => {
    const entry = createAuditEntry(1, "Admin", "admin.stats_viewed", "dashboard");
    expect(entry).toHaveProperty("timestamp");
    expect(entry).toHaveProperty("actorId");
    expect(entry).toHaveProperty("actorName");
    expect(entry).toHaveProperty("action");
    expect(entry).toHaveProperty("entity");
  });
});
