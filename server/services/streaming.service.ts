/**
 * Streaming Service — wraps the LLM API with SSE streaming support.
 * Used by the /api/assess/stream endpoint to deliver incremental evaluation
 * feedback token-by-token to the client.
 *
 * Protocol:
 *   data: {"type":"token","content":"..."}\n\n
 *   data: {"type":"eval_complete","result":{score,confidence,evidence,rationale,feedback}}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 *   data: {"type":"done"}\n\n
 */
import type { Response } from "express";
import { ENV } from "../_core/env";

export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "eval_complete"; result: EvalResult }
  | { type: "error"; message: string }
  | { type: "done" };

export type EvalResult = {
  score: number;
  confidence: number;
  evidence: string[];
  rationale: string;
  feedback: string;
};

/** Write a single SSE event to the response. */
function writeEvent(res: Response, event: StreamEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/** Build the evaluation prompt for streaming. */
function buildEvalPrompt(question: string, answer: string, domain: string): string {
  return `Eres el evaluador de competencias de IttiTalent. Evalúa la siguiente respuesta para el dominio "${domain}".

Pregunta: ${question}
Respuesta del colaborador: ${answer}

Proporciona un análisis detallado y constructivo. Al final de tu análisis, incluye un bloque JSON con este formato exacto:
\`\`\`json
{
  "score": <número 0-100>,
  "confidence": <número 0.0-1.0>,
  "evidence": ["<frase clave 1>", "<frase clave 2>"],
  "rationale": "<explicación breve del puntaje en español>",
  "feedback": "<retroalimentación constructiva de 1-2 oraciones en español>"
}
\`\`\`

Responde en español, tono profesional y motivador.`;
}

/** Extract the JSON eval result from the accumulated streamed text. */
function extractEvalResult(text: string): EvalResult | null {
  try {
    // Look for JSON block in markdown code fence
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch?.[1]) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score) || 60)),
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
        rationale: typeof parsed.rationale === "string" ? parsed.rationale : "Evaluación completada.",
        feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Respuesta evaluada.",
      };
    }

    // Fallback: try raw JSON anywhere in text
    const rawMatch = text.match(/\{[\s\S]*"score"[\s\S]*\}/);
    if (rawMatch) {
      const parsed = JSON.parse(rawMatch[0]);
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score) || 60)),
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
        rationale: typeof parsed.rationale === "string" ? parsed.rationale : "Evaluación completada.",
        feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Respuesta evaluada.",
      };
    }
  } catch {
    // Fall through to default
  }
  return null;
}

/**
 * Stream an LLM evaluation response via SSE.
 * Sends token events as they arrive, then a final eval_complete event.
 * Guards against double-close using a `finished` flag on `res.close`.
 */
export async function streamEvaluation(
  res: Response,
  question: string,
  answer: string,
  domain: string
): Promise<EvalResult | null> {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
  };

  // Guard: abort if client disconnects
  res.on("close", finish);

  const apiUrl =
    ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
      ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
      : "https://forge.manus.im/v1/chat/completions";

  const prompt = buildEvalPrompt(question, answer, domain);

  let capturedResult: EvalResult | null = null;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: 800,
      }),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => "Unknown error");
      if (!finished) writeEvent(res, { type: "error", message: `LLM error: ${response.status} — ${errText}` });
      finish();
      res.end();
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let buffer = "";

    while (true) {
      if (finished) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (finished) break;
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const chunk = JSON.parse(trimmed.slice(6));
          const delta = chunk?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            accumulated += delta;
            writeEvent(res, { type: "token", content: delta });
          }
        } catch {
          // Malformed SSE chunk — skip
        }
      }
    }

    // Extract structured result from accumulated text
    if (!finished) {
      const result = extractEvalResult(accumulated);
      if (result) {
        capturedResult = result;
        writeEvent(res, { type: "eval_complete", result });
      } else {
        // Fallback result if JSON extraction fails
        capturedResult = {
          score: 65,
          confidence: 0.6,
          evidence: [],
          rationale: "Evaluación completada con análisis narrativo.",
          feedback: accumulated.slice(0, 300) || "Tu respuesta fue registrada correctamente.",
        };
        writeEvent(res, { type: "eval_complete", result: capturedResult });
      }
      writeEvent(res, { type: "done" });
    }
  } catch (err) {
    if (!finished) {
      writeEvent(res, {
        type: "error",
        message: err instanceof Error ? err.message : "Error interno del servidor",
      });
    }
  } finally {
    finish();
    res.end();
  }

  return capturedResult;
}
