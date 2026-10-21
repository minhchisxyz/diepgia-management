"use server"

import { cookies } from "next/headers"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/password"
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session"

export type AuthActionState = { error?: string; success?: boolean }

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!username || !password) return { error: "Vui lòng nhập tên đăng nhập và mật khẩu" }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !(await verifyPassword(password, user.password))) {
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng" }
  }

  const cookieStore = await cookies()
  cookieStore.set(
    SESSION_COOKIE,
    await createSession({ userId: user.id, username: user.username, role: user.role, name: user.name }),
    sessionCookieOptions,
  )
  return { success: true }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 })
}

export async function getCurrentUserAction() {
  const session = await getSession()
  if (!session) return null
  return { id: session.userId, username: session.username, role: session.role, name: session.name }
}
