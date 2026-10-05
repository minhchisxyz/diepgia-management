import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const session = await getSession();
  const { id } = await params;

  if (!session || session.userId !== id) {
    return NextResponse.json({ error: "Bạn chỉ có thể xem tài khoản của mình" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, role: true },
  });

  return user
    ? NextResponse.json(user)
    : NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession();
  const { id } = await params;

  if (!session || session.userId !== id) {
    return NextResponse.json({ error: "Bạn chỉ có thể chỉnh sửa tài khoản của mình" }, { status: 403 });
  }

  const body: unknown = await request.json();
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const update: { name?: string; password?: string } = {};
  if (typeof data.name === "string") {
    if (!data.name.trim()) {
      return NextResponse.json({ error: "Tên không được để trống" }, { status: 400 });
    }
    update.name = data.name.trim();
  }
  if (typeof data.password === "string") {
    if (data.password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 8 ký tự" }, { status: 400 });
    }
    update.password = await hashPassword(data.password);
  }

  if (!update.name && !update.password) {
    return NextResponse.json({ error: "Vui lòng nhập tên hoặc mật khẩu mới" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: update,
    select: { id: true, name: true, username: true, role: true },
  });

  return NextResponse.json(user);
}
