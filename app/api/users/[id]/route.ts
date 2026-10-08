import { UserRole } from "@prisma/client"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { hashPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteContext) {
  const session = await getSession()
  const { id } = await params

  if (!session || session.userId !== id) {
    return NextResponse.json({ error: "Bạn chỉ có thể xem tài khoản của mình" }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, role: true },
  });

  return user
    ? NextResponse.json(user)
    : NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 })
}

async function update(request: Request, { params }: RouteContext) {
  const session = await getSession()
  const { id } = await params
  const isAdmin = session?.role === UserRole.ADMIN
  if (!session || (!isAdmin && session.userId !== id)) {
    return NextResponse.json({ error: "Bạn không có quyền chỉnh sửa tài khoản này" }, { status: 403 })
  }

  const body: unknown = await request.json()
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  const data = body as Record<string, unknown>
  const update: { name?: string; username?: string; password?: string; role?: UserRole } = {}
  if (typeof data.name === "string") {
    if (!data.name.trim()) {
      return NextResponse.json({ error: "Tên không được để trống" }, { status: 400 })
    }
    update.name = data.name.trim()
  } else if (data.name !== undefined) {
    return NextResponse.json({ error: "Tên không hợp lệ" }, { status: 400 })
  }
  if (data.username !== undefined) {
    if (!isAdmin || typeof data.username !== "string" || data.username.trim().length < 8) {
      return NextResponse.json({ error: "Tên đăng nhập phải có ít nhất 8 ký tự" }, { status: 400 })
    }
    update.username = data.username.trim()
  }
  if (data.role !== undefined) {
    if (!isAdmin || (data.role !== UserRole.ADMIN && data.role !== UserRole.USER)) {
      return NextResponse.json({ error: "Vai trò không hợp lệ" }, { status: 400 })
    }
    update.role = data.role as UserRole
  }
  if (typeof data.password === "string") {
    if (data.password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 8 ký tự" }, { status: 400 })
    }
    update.password = await hashPassword(data.password)
  } else if (data.password !== undefined) {
    return NextResponse.json({ error: "Mật khẩu không hợp lệ" }, { status: 400 })
  }

  if (!update.name && !update.username && !update.password && !update.role) {
    return NextResponse.json({ error: "Vui lòng nhập thông tin cần thay đổi" }, { status: 400 })
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: update,
      select: { id: true, name: true, username: true, role: true, createdAt: true, updatedAt: true },
    })
    return NextResponse.json(user)
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Tên đăng nhập đã được sử dụng" }, { status: 409 })
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 })
    }
    throw error
  }
}

export const PUT = update
export const PATCH = update

export async function DELETE(_: Request, { params }: RouteContext) {
  const session = await getSession()
  const { id } = await params
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền xóa người dùng" }, { status: 403 })
  }
  if (session.userId === id) {
    return NextResponse.json({ error: "Không thể xóa tài khoản đang đăng nhập" }, { status: 400 })
  }
  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 })
    }
    throw error
  }
}
