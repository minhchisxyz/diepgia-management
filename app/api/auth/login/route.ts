import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);

async function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const expectedKey = Buffer.from(key, "hex");
  return (
    derivedKey.length === expectedKey.length &&
    timingSafeEqual(derivedKey, expectedKey)
  );
}

export async function POST(request: Request) {
  const body: unknown = await request.json();
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).username !== "string" ||
    typeof (body as Record<string, unknown>).password !== "string"
  ) {
    return NextResponse.json({ error: "Thông tin đăng nhập không hợp lệ" }, { status: 400 });
  }

  const { username, password } = body as { username: string; password: string };
  const user = await prisma.user.findUnique({ where: { username: username.trim() } });

  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json(
      { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ user: { name: user.name, role: user.role } });
  response.cookies.set(
    SESSION_COOKIE,
    await createSession({ userId: user.id, username: user.username, role: user.role }),
    sessionCookieOptions,
  );
  return response;
}
