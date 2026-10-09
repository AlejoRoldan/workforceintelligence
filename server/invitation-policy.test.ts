import { describe, expect, it } from "vitest";
import {
  isInvitationEmailAllowed,
  isInvitationExpired,
  normalizeReturnPath,
  normalizeInvitationEmail,
} from "../shared/invitation-policy";

describe("política de invitaciones", () => {
  it("normaliza el correo antes de compararlo", () => {
    expect(normalizeInvitationEmail("  Alejo@Example.COM ")).toBe("alejo@example.com");
    expect(isInvitationEmailAllowed("Alejo@Example.COM", " alejo@example.com ")).toBe(true);
  });

  it("permite invitaciones sin correo restringido", () => {
    expect(isInvitationEmailAllowed(null, "cualquiero@correo.com")).toBe(true);
    expect(isInvitationEmailAllowed("", "cualquiero@correo.com")).toBe(true);
  });

  it("rechaza un correo distinto al destinatario", () => {
    expect(isInvitationEmailAllowed("persona@empresa.com", "otra@empresa.com")).toBe(false);
  });

  it("considera expirado el enlace en el instante de expiración", () => {
    const now = new Date("2026-10-09T17:00:00.000Z");
    expect(isInvitationExpired(new Date("2026-10-09T17:00:00.000Z"), now)).toBe(true);
    expect(isInvitationExpired(new Date("2026-10-09T17:00:01.000Z"), now)).toBe(false);
  });

  it("solo permite rutas internas al volver de OAuth", () => {
    expect(normalizeReturnPath("/join?token=abc")).toBe("/join?token=abc");
    expect(normalizeReturnPath("https://phishing.example")).toBe("/");
    expect(normalizeReturnPath("//phishing.example")).toBe("/");
  });
});
