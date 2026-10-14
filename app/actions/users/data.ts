"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { Prisma, UserRole } from "@prisma/client"
import { fail } from "@/lib/utils"

export async function requireSession(admin = false) {
  const session = await getSession()

  if (!session || (admin && session.role !== `ADMIN`)) {
    throw new Error(`Bạn không có quyền thực hiện thao tác này`)
  }

  return session
}

export async function listUsers(search = ``, page = 1, pageSize = 10) {
  await requireSession(true)

  const query = search.trim()
  const where: Prisma.UserWhereInput | undefined = query
    ? {
        OR: [
          { name: { contains: query, mode: `insensitive` } },
          { username: { contains: query, mode: `insensitive` } },
        ],
      }
    : undefined

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: `desc` },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return {
    items: items.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })),
    total,
  }
}

export async function createUser(username: string) {
  await requireSession(true)

  try {
    const value = username.trim()
    const result = await prisma.user.create({
      data: {
        name: value,
        username: value,
        password: await hashPassword(value),
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
    })

    revalidatePath(`/users`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function updateUser(
  id: string,
  data: {
    name: string
    username: string
    role: UserRole
    password?: string
  },
) {
  await requireSession(true)

  try {
    const result = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        username: data.username,
        role: data.role,
        ...(data.password
          ? { password: await hashPassword(data.password) }
          : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    revalidatePath(`/users`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function deleteUser(id: string) {
  await requireSession(true)

  try {
    await prisma.user.delete({ where: { id } })
    revalidatePath(`/users`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function updateProfile(data: {
  name: string
  password?: string
}) {
  const session = await requireSession()

  try {
    const result = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: data.name,
        ...(data.password
          ? { password: await hashPassword(data.password) }
          : {}),
      },
    })

    revalidatePath(`/users/${session.userId}`)
    return { success: true, name: result.name }
  } catch (error) {
    return fail(error)
  }
}
