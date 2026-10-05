export const SESSION_COOKIE = "diepgia_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type SessionPayload = {
  userId: string;
  username: string;
  role: "ADMIN" | "USER";
  exp: number;
}

function encode(value: string) {
  return btoa(value)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
}

function decode(value: string) {
  return atob(value.replace(/-/g, "+").replace(/_/g, "/"));
}

async function getSigningKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSession(payload: Omit<SessionPayload, "exp">) {
  const encodedPayload = encode(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(),
    new TextEncoder().encode(encodedPayload),
  );
  return `${encodedPayload}.${encode(String.fromCharCode(...new Uint8Array(signature)))}`;
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;
  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) return null;

  try {
    const signature = Uint8Array.from(decode(encodedSignature), (char) => char.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      signature,
      new TextEncoder().encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(decode(encodedPayload)) as SessionPayload;
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
