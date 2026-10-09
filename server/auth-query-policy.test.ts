import { describe, expect, it } from "vitest";
import {
  AUTH_QUERY_RETRY_COUNT,
  getAuthQueryRetryDelay,
} from "../shared/auth-query-policy";

describe("política de consulta auth.me", () => {
  it("reintenta una vez ante un fallo transitorio de red", () => {
    expect(AUTH_QUERY_RETRY_COUNT).toBe(1);
  });

  it("aplica una espera exponencial breve y acotada", () => {
    expect(getAuthQueryRetryDelay(0)).toBe(400);
    expect(getAuthQueryRetryDelay(1)).toBe(800);
    expect(getAuthQueryRetryDelay(8)).toBe(1_500);
  });

  it("no genera demoras negativas", () => {
    expect(getAuthQueryRetryDelay(-2)).toBe(400);
  });
});
