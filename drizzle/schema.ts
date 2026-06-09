import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  float,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  jobTitle: varchar("jobTitle", { length: 128 }),
  department: varchar("department", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Onboarding Sessions ──────────────────────────────────────────────────────
// Each collaborator has one onboarding session. Messages are stored as JSON.
export const onboardingSessions = mysqlTable("onboarding_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  // JSON array of { role: "user"|"assistant", content: string }
  messages: json("messages").$type<{ role: string; content: string }[]>(),
  // Extracted competency profile from onboarding conversation
  competencyProfile: json("competencyProfile").$type<Record<string, number>>(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OnboardingSession = typeof onboardingSessions.$inferSelect;

// ─── Competency Assessments (Proof of Skills) ─────────────────────────────────
export const competencyAssessments = mysqlTable("competency_assessments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  // Generated questions: JSON array of { id, question, macroDomain, competencyLayer, options?, type }
  questions: json("questions").$type<AssessmentQuestion[]>(),
  // User answers: JSON array of { questionId, answer, score, feedback }
  answers: json("answers").$type<AssessmentAnswer[]>(),
  // Final radar scores per macro domain (0-100)
  radarScores: json("radarScores").$type<RadarScore[]>(),
  // Overall score 0-100
  overallScore: float("overallScore"),
  // AI-generated narrative summary
  summary: text("summary"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompetencyAssessment = typeof competencyAssessments.$inferSelect;

// ─── Shared Types ─────────────────────────────────────────────────────────────
export type MacroDomain =
  | "Digital & GenAI"
  | "Liderazgo Moderno"
  | "Operación Ágil"
  | "Customer Experience"
  | "Data-driven"
  | "Innovación";

export type CompetencyLayer =
  | "Organizacionales"
  | "Liderazgo"
  | "Funcionales"
  | "Estratégicas Futuras";

export interface AssessmentQuestion {
  id: string;
  question: string;
  macroDomain: MacroDomain;
  competencyLayer: CompetencyLayer;
  type: "open" | "multiple_choice";
  options?: string[];
}

export interface AssessmentAnswer {
  questionId: string;
  answer: string;
  score: number; // 0-100
  feedback: string;
}

export interface RadarScore {
  domain: MacroDomain;
  score: number;       // 0-100 actual
  expected: number;    // 0-100 expected for role
}
