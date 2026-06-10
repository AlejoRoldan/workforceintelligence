/**
 * useAssessmentStream — React hook for consuming the /api/assess/stream SSE endpoint.
 *
 * Usage:
 *   const { streamEval, state, reset } = useAssessmentStream();
 *   await streamEval({ questionId, question, answer, domain });
 *
 * State shape:
 *   status: "idle" | "streaming" | "complete" | "error"
 *   tokens: string          — accumulated text tokens as they arrive
 *   result: EvalResult | null — structured result once eval_complete fires
 *   error: string | null
 */
import { useState, useCallback, useRef } from "react";

export type EvalResult = {
  score: number;
  confidence: number;
  evidence: string[];
  rationale: string;
  feedback: string;
};

export type StreamStatus = "idle" | "streaming" | "complete" | "error";

export type StreamState = {
  status: StreamStatus;
  tokens: string;
  result: EvalResult | null;
  error: string | null;
};

type StreamParams = {
  questionId: string;
  question: string;
  answer: string;
  domain: string;
};

const INITIAL_STATE: StreamState = {
  status: "idle",
  tokens: "",
  result: null,
  error: null,
};

export function useAssessmentStream() {
  const [state, setState] = useState<StreamState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  const streamEval = useCallback(async (params: StreamParams): Promise<EvalResult | null> => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: "streaming", tokens: "", result: null, error: null });

    try {
      const response = await fetch("/api/assess/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Error del servidor" }));
        setState((s) => ({ ...s, status: "error", error: errData.error ?? "Error desconocido" }));
        return null;
      }

      if (!response.body) {
        setState((s) => ({ ...s, status: "error", error: "Sin cuerpo de respuesta" }));
        return null;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: EvalResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(trimmed.slice(6));

            if (event.type === "token") {
              setState((s) => ({ ...s, tokens: s.tokens + event.content }));
            } else if (event.type === "eval_complete") {
              finalResult = event.result as EvalResult;
              setState((s) => ({ ...s, result: finalResult }));
            } else if (event.type === "done") {
              setState((s) => ({ ...s, status: "complete" }));
            } else if (event.type === "error") {
              setState((s) => ({ ...s, status: "error", error: event.message }));
            }
          } catch {
            // Malformed event — skip
          }
        }
      }

      return finalResult;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setState(INITIAL_STATE);
        return null;
      }
      const message = err instanceof Error ? err.message : "Error de conexión";
      setState((s) => ({ ...s, status: "error", error: message }));
      return null;
    }
  }, []);

  return { streamEval, state, reset };
}
