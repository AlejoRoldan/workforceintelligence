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
export const onboardingSessions = mysqlTable("onboarding_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  messages: json("messages").$type<{ role: string; content: string }[]>(),
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
  questions: json("questions").$type<AssessmentQuestion[]>(),
  answers: json("answers").$type<AssessmentAnswer[]>(),
  radarScores: json("radarScores").$type<RadarScore[]>(),
  overallScore: float("overallScore"),
  summary: text("summary"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompetencyAssessment = typeof competencyAssessments.$inferSelect;

// ─── Competency Domains ───────────────────────────────────────────────────────
// Catalog of the 6 strategic macro domains. Seeded at startup, configurable by admin.
export const competencyDomains = mysqlTable("competency_domains", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  description: text("description"),
  competencyLayer: mysqlEnum("competencyLayer", [
    "Organizacionales",
    "Liderazgo",
    "Funcionales",
    "Estratégicas Futuras",
  ]).notNull(),
  active: boolean("active").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompetencyDomain = typeof competencyDomains.$inferSelect;
export type InsertCompetencyDomain = typeof competencyDomains.$inferInsert;

// ─── Role Skill Expectations ──────────────────────────────────────────────────
// Expected score per domain per job role. Enables gap analysis per collaborator.
export const roleSkillExpectations = mysqlTable("role_skill_expectations", {
  id: int("id").autoincrement().primaryKey(),
  roleName: varchar("roleName", { length: 128 }).notNull(),
  domainId: int("domainId").notNull(),
  expectedScore: int("expectedScore").notNull(),  // 0–100
  weight: float("weight").default(1.0).notNull(), // relative importance for overall score
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RoleSkillExpectation = typeof roleSkillExpectations.$inferSelect;
export type InsertRoleSkillExpectation = typeof roleSkillExpectations.$inferInsert;

// ─── Competency Evidence ──────────────────────────────────────────────────────
// Stores AI-extracted evidence per answer, linked to an assessment.
export const competencyEvidence = mysqlTable("competency_evidence", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  domainId: int("domainId").notNull(),
  questionId: varchar("questionId", { length: 32 }).notNull(),
  evidence: json("evidence").$type<string[]>(),   // key phrases extracted by AI
  confidence: float("confidence").notNull(),       // 0–1
  rationale: text("rationale"),                   // AI explanation
  score: int("score").notNull(),                  // 0–100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompetencyEvidence = typeof competencyEvidence.$inferSelect;
export type InsertCompetencyEvidence = typeof competencyEvidence.$inferInsert;

// ─── Learning Plans ─────────────────────────────────────────────────────────
// AI-generated personalized development plan per collaborator post-assessment.
export const learningPlans = mysqlTable("learning_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  assessmentId: int("assessmentId").notNull(),
  status: mysqlEnum("status", ["generating", "ready", "in_progress", "completed"]).default("generating").notNull(),
  planJson: json("planJson").$type<LearningPlan>(),
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LearningPlanRow = typeof learningPlans.$inferSelect;
export type InsertLearningPlan = typeof learningPlans.$inferInsert;

// ─── Notifications ───────────────────────────────────────────────────────────
// In-app notifications for admin users (P&C team events).
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),          // recipient (admin)
  type: mysqlEnum("type", [
    "onboarding_completed",
    "assessment_completed",
    "learning_plan_ready",
    "profile_updated",
  ]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  relatedUserId: int("relatedUserId"),       // collaborator who triggered the event
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── User Invitations ───────────────────────────────────────────────────────
// Admin-generated invitation links for onboarding new collaborators.
export const userInvitations = mysqlTable("user_invitations", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  invitedBy: int("invitedBy").notNull(),       // admin userId who created it
  note: text("note"),                           // optional message for the invitee
  usedAt: timestamp("usedAt"),                  // null = not yet used
  usedByUserId: int("usedByUserId"),            // userId who redeemed it
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;

// ─── Assessment History ───────────────────────────────────────────────────────
// Snapshot of each completed assessment for longitudinal tracking.
export const assessmentHistory = mysqlTable("assessment_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  assessmentId: int("assessmentId").notNull(),
  overallScore: float("overallScore").notNull(),
  radarScores: json("radarScores").$type<RadarScore[]>(),
  summary: text("summary"),
  completedAt: timestamp("completedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssessmentHistoryRow = typeof assessmentHistory.$inferSelect;
export type InsertAssessmentHistory = typeof assessmentHistory.$inferInsert;

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

// ─── Learning Plan Types ──────────────────────────────────────────────────────
export interface LearningAction {
  id: string;                    // nanoid
  title: string;                 // e.g. "Completar curso de Prompt Engineering"
  description: string;           // 1-2 sentences
  resourceType: "course" | "book" | "practice" | "mentoring" | "project";
  resourceUrl?: string;          // optional link
  estimatedHours: number;        // effort estimate
  priority: "high" | "medium" | "low";
  completed: boolean;
  completedAt?: string;          // ISO date string
}

export interface LearningDomainPlan {
  domain: MacroDomain;
  currentScore: number;          // from assessment
  expectedScore: number;         // from role expectations
  gap: number;                   // expected - current
  priority: "critical" | "moderate" | "on-track";
  rationale: string;             // AI explanation of why this domain matters
  actions: LearningAction[];     // 2-4 concrete actions
}

export interface LearningPlan {
  version: 1;
  collaboratorName: string;
  jobTitle: string;
  generatedAt: string;           // ISO date string
  overallGapScore: number;       // weighted average gap
  topPriorityDomain: MacroDomain;
  executiveSummary: string;      // AI narrative (2-3 sentences)
  domains: LearningDomainPlan[]; // one entry per domain with gap > 0
  totalActions: number;
  estimatedTotalHours: number;
}
