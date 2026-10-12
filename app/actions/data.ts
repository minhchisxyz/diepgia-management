"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { LoaiVatTu, Prisma, UserRole } from "@prisma/client"

async function requireSession(admin = false) {
  const session = await getSession()

  if (!session || (admin && session.role !== `ADMIN`)) {
    throw new Error(`Bạn không có quyền thực hiện thao tác này`)
  }

  return session
}

function fail(error: unknown) {
  return {
    error: error instanceof Error
      ? error.message
      : `Không thể thực hiện thao tác`,
  }
}

export async function listCustomers(search = ``, page = 1, pageSize = 10) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.KhachHangWhereInput | undefined = query
    ? {
        OR: [
          { mskh: { contains: query, mode: `insensitive` } },
          { ten: { contains: query, mode: `insensitive` } },
          { tenCongTy: { contains: query, mode: `insensitive` } },
        ],
      }
    : undefined

  const [items, total] = await Promise.all([
    prisma.khachHang.findMany({
      where,
      orderBy: { mskh: `asc` },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.khachHang.count({ where }),
  ])

  return { items, total }
}

export async function createCustomer(data: Record<string, string | null>) {
  await requireSession()

  try {
    const result = await prisma.khachHang.create({
      data: {
        mskh: data.mskh?.trim() ?? ``,
        ten: data.ten?.trim() ?? ``,
        tenCongTy: data.tenCongTy?.trim() || null,
        diaChi: data.diaChi?.trim() ?? ``,
        tinh: data.tinh?.trim() ?? ``,
        email: data.email?.trim() || null,
        maSoThue: data.maSoThue?.trim() || null,
        soDienThoai: data.soDienThoai?.trim() || null,
      },
    })

    revalidatePath(`/khach-hang`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function updateCustomer(
  id: string,
  data: Record<string, string | null>,
) {
  await requireSession()

  try {
    const result = await prisma.khachHang.update({
      where: { mskh: id },
      data: {
        ...data,
        tenCongTy: data.tenCongTy || null,
        email: data.email || null,
        maSoThue: data.maSoThue || null,
        soDienThoai: data.soDienThoai || null,
      },
    })

    revalidatePath(`/khach-hang`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function deleteCustomer(id: string) {
  await requireSession()

  try {
    await prisma.khachHang.delete({ where: { mskh: id } })
    revalidatePath(`/khach-hang`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function listIngredients(search = ``, page = 1, pageSize = 10) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.NguyenLieuWhereInput | undefined = query
    ? { ten: { contains: query, mode: `insensitive` } }
    : undefined

  const [rows, total] = await Promise.all([
    prisma.nguyenLieu.findMany({
      where,
      include: { gia: { orderBy: { ngay: `desc` } } },
      orderBy: { ten: `asc` },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.nguyenLieu.count({ where }),
  ])

  const items = rows.map(({ gia, ...item }) => ({
    ...item,
    donGia: gia[0]?.donGia?.toString() ?? null,
    gia: gia.map((price) => ({
      ...price,
      ngay: price.ngay.toISOString(),
      donGia: price.donGia.toString(),
    })),
  }))

  return { items, total }
}

export async function createIngredient(data: {
  ten: string
  donVi: string
  loai: string
}) {
  await requireSession()

  try {
    const result = await prisma.nguyenLieu.create({ data })
    revalidatePath(`/nguyen-lieu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function updateIngredient(
  id: string,
  data: { ten: string; donVi: string; loai: string },
) {
  await requireSession()

  try {
    const result = await prisma.nguyenLieu.update({ where: { id }, data })
    revalidatePath(`/nguyen-lieu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function deleteIngredient(id: string) {
  await requireSession()

  try {
    await prisma.nguyenLieu.delete({ where: { id } })
    revalidatePath(`/nguyen-lieu`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function saveIngredientPrice(
  nguyenLieuId: string,
  ngay: string,
  donGia: number,
) {
  await requireSession()

  try {
    const date = new Date(`${ngay}T00:00:00Z`)
    const result = await prisma.nguyenLieuDonGia.upsert({
      where: { nguyenLieuId_ngay: { nguyenLieuId, ngay: date } },
      create: { nguyenLieuId, ngay: date, donGia },
      update: { donGia },
    })

    revalidatePath(`/nguyen-lieu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function deleteIngredientPrice(
  nguyenLieuId: string,
  ngay: string,
) {
  await requireSession()

  try {
    const date = new Date(`${ngay}T00:00:00Z`)
    await prisma.nguyenLieuDonGia.delete({
      where: { nguyenLieuId_ngay: { nguyenLieuId, ngay: date } },
    })

    revalidatePath(`/nguyen-lieu`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function listIngredientPrices(nguyenLieuId: string) {
  await requireSession()

  const prices = await prisma.nguyenLieuDonGia.findMany({
    where: { nguyenLieuId },
    orderBy: { ngay: `desc` },
  })

  return prices.map((price) => ({
    ...price,
    ngay: price.ngay.toISOString(),
    donGia: price.donGia.toString(),
  }))
}

export async function listVatTu(search = ``, page = 1, pageSize = 10) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.VatTuWhereInput | undefined = query
    ? { mskh: { contains: query, mode: `insensitive` } }
    : undefined

  const [items, total] = await Promise.all([
    prisma.vatTu.findMany({
      where,
      include: { khachHang: true },
      orderBy: { ms: `asc` },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vatTu.count({ where }),
  ])

  return { items, total }
}

export async function createVatTu(data: {
  ms: string
  ten: LoaiVatTu
  loai: string
  mskh: string
}) {
  await requireSession()

  try {
    const result = await prisma.vatTu.create({
      data,
      include: { khachHang: true },
    })

    revalidatePath(`/vat-tu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function updateVatTu(
  ms: string,
  data: { ten: LoaiVatTu; loai: string; mskh: string },
) {
  await requireSession()

  try {
    const result = await prisma.vatTu.update({
      where: { ms },
      data,
      include: { khachHang: true },
    })

    revalidatePath(`/vat-tu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function deleteVatTu(ms: string) {
  await requireSession()

  try {
    await prisma.vatTu.delete({ where: { ms } })
    revalidatePath(`/vat-tu`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function listProducts(search = ``, page = 1, pageSize = 10) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.SanPhamWhereInput | undefined = query
    ? { mssp: { contains: query, mode: `insensitive` } }
    : undefined

  const [rows, total] = await Promise.all([
    prisma.sanPham.findMany({
      where,
      include: {
        khachHang: { select: { mskh: true, ten: true } },
        nguyenLieu: { include: { nguyenLieu: true } },
      },
      orderBy: { mssp: `asc` },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sanPham.count({ where }),
  ])

  const items = rows.map((row) => ({
    ...row,
    quyCachThung: String(row.quyCachThung),
    donGia: String(row.donGia),
    nguyenLieu: row.nguyenLieu.map((item) => ({
      ...item,
      giaTri: item.giaTri.toString(),
    })),
  }))

  return { items, total }
}

type ProductInput = {
  mssp: string
  mskh: string
  tenThuongMai: string
  tenPhanBon: string
  quyCach: string
  quyCachThung: number
  donGia: number
  nguyenLieu: { nguyenLieuId: string; giaTri: number }[]
}

export async function createProduct(data: ProductInput) {
  await requireSession()

  try {
    const result = await prisma.sanPham.create({
      data: {
        ...data,
        nguyenLieu: { create: data.nguyenLieu },
      },
      include: {
        khachHang: true,
        nguyenLieu: { include: { nguyenLieu: true } },
      },
    })

    revalidatePath(`/san-pham`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function updateProduct(mssp: string, data: ProductInput) {
  await requireSession()

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.congThucNguyenLieu.deleteMany({ where: { mssp } })

      return tx.sanPham.update({
        where: { mssp },
        data: {
          ...data,
          nguyenLieu: { create: data.nguyenLieu },
        },
        include: {
          khachHang: true,
          nguyenLieu: { include: { nguyenLieu: true } },
        },
      })
    })

    revalidatePath(`/san-pham`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function deleteProduct(mssp: string) {
  await requireSession()

  try {
    await prisma.sanPham.delete({ where: { mssp } })
    revalidatePath(`/san-pham`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
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
