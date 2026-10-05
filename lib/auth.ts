import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function getSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}

export { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
