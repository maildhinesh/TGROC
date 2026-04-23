import { createHmac } from "crypto";

const CODE_PREFIX = "TGROC_CHECKIN_V1";

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET. Cannot generate check-in codes.");
  }
  return secret;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export interface CheckInCodePayload {
  eventId: string;
  email: string;
  rsvpId: string;
}

export function generateCheckInCode(payload: CheckInCodePayload): string {
  const body = {
    ...payload,
    v: 1,
    iat: Date.now(),
  };

  const encodedPayload = toBase64Url(JSON.stringify(body));
  const signature = createHmac("sha256", getSecret())
    .update(`${CODE_PREFIX}.${encodedPayload}`)
    .digest("base64url");

  return `${CODE_PREFIX}.${encodedPayload}.${signature}`;
}

export function verifyCheckInCode(code: string): CheckInCodePayload | null {
  const parts = code.split(".");
  if (parts.length !== 3) return null;

  const [prefix, encodedPayload, signature] = parts;
  if (prefix !== CODE_PREFIX) return null;

  const expected = createHmac("sha256", getSecret())
    .update(`${CODE_PREFIX}.${encodedPayload}`)
    .digest("base64url");

  if (expected !== signature) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as {
      eventId: string;
      email: string;
      rsvpId: string;
      v: number;
      iat: number;
    };

    if (!parsed.eventId || !parsed.email || !parsed.rsvpId || parsed.v !== 1) return null;

    return {
      eventId: parsed.eventId,
      email: parsed.email,
      rsvpId: parsed.rsvpId,
    };
  } catch {
    return null;
  }
}
