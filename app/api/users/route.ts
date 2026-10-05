import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền xem danh sách" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền tạo người dùng" }, { status: 403 });
  }

  const body: unknown = await request.json();

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).username !== "string"
  ) {
    return NextResponse.json({ error: "Tên đăng nhập là bắt buộc" }, { status: 400 });
  }

  const { username } = body as {
    username: string;
  };

  if (username.trim().length < 8) {
    return NextResponse.json(
      { error: "Tên đăng nhập phải có ít nhất 8 ký tự" },
      { status: 400 },
    );
  }

  try {
    const defaultValue = username.trim();
    const user = await prisma.user.create({
      data: {
        name: defaultValue,
        username: defaultValue,
        password: await hashPassword(defaultValue),
        role: UserRole.USER,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Username is already in use" }, { status: 409 });
    }

    throw error;
  }
}
