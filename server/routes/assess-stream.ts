/**
 * POST /api/assess/stream
 *
 * SSE endpoint for incremental AI evaluation of a single assessment answer.
 * Authenticates via session cookie (same JWT used by tRPC).
 * Rate-limited to 20 req/min per user (reuses the LLM rate limiter).
 *
 * Request body: { questionId: string, question: string, answer: string, domain: string }
 * Response: text/event-stream — see streaming.service.ts for event protocol
 */
import { Router, type Request, type Response } from "express";
import { jwtVerify } from "jose";
import { ENV } from "../_core/env";
import { COOKIE_NAME } from "../../shared/const";
import { streamEvaluation, type EvalResult } from "../services/streaming.service";
import { llmRateLimit } from "../middleware/rate-limit";
import { getAssessmentByUserId } from "../repositories/assessment.repository";
import { saveEvidence, getDomainByName } from "../repositories/competency.repository";

const router = Router();

/** Parse session cookie and return userId, or null if invalid. */
async function getUserIdFromCookie(req: Request): Promise<number | null> {
  try {
    const cookieHeader = req.headers.cookie ?? "";
    const cookies: Record<string, string> = {};
    for (const part of cookieHeader.split(";")) {
      const [k, ...v] = part.trim().split("=");
      if (k) cookies[k.trim()] = decodeURIComponent(v.join("="));
    }

    const token = cookies[COOKIE_NAME];
    if (!token) return null;

    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload["userId"];
    return typeof userId === "number" ? userId : null;
  } catch {
    return null;
  }
}

router.post("/api/assess/stream", llmRateLimit, async (req: Request, res: Response) => {
  // Auth check
  const userId = await getUserIdFromCookie(req);
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  // Validate body
  const { questionId, question, answer, domain } = req.body ?? {};
  if (
    typeof question !== "string" || question.trim().length === 0 ||
    typeof answer !== "string" || answer.trim().length === 0 ||
    typeof domain !== "string" || domain.trim().length === 0
  ) {
    res.status(400).json({ error: "Se requieren question, answer y domain" });
    return;
  }

  // Verify the user has an active assessment (prevents abuse)
  try {
    const assessment = await getAssessmentByUserId(userId);
    if (!assessment) {
      res.status(403).json({ error: "No tienes una evaluación activa" });
      return;
    }
    if (assessment.status === "completed") {
      res.status(400).json({ error: "La evaluación ya fue completada" });
      return;
    }
  } catch {
    // If DB check fails, allow through — streaming will handle gracefully
  }

  // Get assessment id for evidence persistence
  let assessmentId: number | null = null;
  try {
    const assessment = await getAssessmentByUserId(userId);
    assessmentId = assessment?.id ?? null;
  } catch { /* non-blocking */ }

  // Stream the evaluation — result is returned after stream completes
  const evalResult: EvalResult | null = await streamEvaluation(res, question.trim(), answer.trim(), domain.trim());

  // Persist evidence in DB (non-blocking, best-effort)
  if (evalResult && assessmentId) {
    try {
      const domainRecord = await getDomainByName(domain.trim());
      if (domainRecord) {
        await saveEvidence({
          assessmentId,
          domainId: domainRecord.id,
          questionId: typeof questionId === "string" ? questionId : "unknown",
          score: evalResult.score,
          confidence: evalResult.confidence,
          evidence: evalResult.evidence,
          rationale: evalResult.rationale,
        });
      }
    } catch (err) {
      console.warn("[assess-stream] Evidence persistence failed:", err);
    }
  }
});

export { router as assessStreamRouter };
