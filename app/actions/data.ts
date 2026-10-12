"use server"

import { revalidatePath } from "next/cache"
import path from "node:path"
import ExcelJS from "exceljs"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { LoaiVatTu, Prisma, UserRole } from "@prisma/client"
import { formatDateTime } from "@/lib/utils"
import type { Row } from "exceljs"

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

export async function listProductsForCustomer(mskh: string) {
  await requireSession()

  return prisma.sanPham.findMany({
    where: { mskh },
    orderBy: { mssp: `asc` },
    select: {
      mssp: true,
      tenPhanBon: true,
      tenThuongMai: true,
      quyCach: true,
    },
  })
}

export async function createXuatHang(
  mskh: string,
  sanPham: { mssp: string; soLuongThung: number }[],
) {
  const session = await requireSession()
  const customerCode = mskh.trim()

  if (!customerCode || sanPham.length === 0) {
    return { error: `Khách hàng và ít nhất một sản phẩm là bắt buộc` }
  }

  if (sanPham.some((item) => !Number.isInteger(item.soLuongThung) || item.soLuongThung <= 0)) {
    return { error: `Số lượng thùng phải là số nguyên lớn hơn 0` }
  }

  const productCodes = sanPham.map((item) => item.mssp)
  if (new Set(productCodes).size !== productCodes.length) {
    return { error: `Không được chọn trùng sản phẩm` }
  }

  try {
    const products = await prisma.sanPham.findMany({
      where: { mskh: customerCode, mssp: { in: productCodes } },
      select: { mssp: true, tenThuongMai: true, quyCach: true, quyCachThung: true },
    })

    if (products.length !== productCodes.length) {
      return { error: `Sản phẩm không thuộc khách hàng đã chọn` }
    }

    const delivery = await prisma.xuatHang.create({
      data: {
        mskh: customerCode,
        nguoiLapPhieuId: session.userId,
        sanPham: {
          create: sanPham.map((item) => ({
            mssp: item.mssp,
            soLuongThung: item.soLuongThung,
          })),
        },
      },
    })

    const templatePath = path.join(process.cwd(), `public`, `pxh.xlsx`)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(templatePath)
    const worksheet = workbook.getWorksheet(1)
    if (!worksheet) {
      return { error: `Không thể đọc file mẫu phiếu xuất hàng` }
    }
    worksheet.getCell(`H1`).value = delivery.soPhieu
    worksheet.getCell(`H2`).value = formatDateTime(delivery.ngayXuatHang)

    const customer = await prisma.khachHang.findUnique({ where: { mskh: customerCode } })
    if (!customer) {
      return { error: `Không tìm thấy thông tin khách hàng` }
    }
    worksheet.getCell(`C4`).value = customer.ten
    worksheet.getCell(`C5`).value = customer.tenCongTy ?? ``
    worksheet.getCell(`C6`).value = customer.maSoThue ?? ``
    worksheet.getCell(`C7`).value = customer.diaChi
    worksheet.getCell(`E4`).value = customer.soDienThoai ?? ``
    worksheet.getCell(`H4`).value = customer.tinh
    function formatRow(row: Row) {
      for (let i = 1 ; i <= 8 ; i++) {
        const cell = row.getCell(i)
        cell.font = {
          name: 'Times New Roman'
        }
        cell.border = {
          top: { style: `thin` },
          left: { style: `thin` },
          bottom: { style: `thin` },
          right: { style: `thin` },
        }
      }
    }
    products.forEach((product, index) => {
      formatRow(worksheet.addRow([index + 1, product.mssp, product.tenThuongMai, product.quyCach, product.quyCachThung, sanPham[index].soLuongThung]))
    })
    formatRow(worksheet.addRow([]))
    const start = 11 + sanPham.length
    worksheet.getCell(`F${start - 1}`).value = sanPham.reduce((acc, item) => acc + item.soLuongThung, 0)
    worksheet.getCell(`F${start - 1}`).font = { name: `Times New Roman` }

    worksheet.getCell(`A${start}`).value = `Địa chỉ giao hàng:`
    worksheet.getCell(`A${start}`).font = { name: `Times New Roman` }

    worksheet.getCell(`A${start + 1}`).value = `Người lập phiếu`
    worksheet.getCell(`A${start + 1}`).font = { name: `Times New Roman` }

    worksheet.getCell(`C${start + 1}`).value = `Người lên hàng`
    worksheet.getCell(`C${start + 1}`).font = { name: `Times New Roman` }

    worksheet.getCell(`C${start + 1}`).value = `Thủ kho`
    worksheet.getCell(`C${start + 1}`).font = { name: `Times New Roman` }

    worksheet.getCell(`G${start}`).value = `SĐT chành:`
    worksheet.getCell(`G${start}`).font = { name: `Times New Roman` }

    worksheet.getCell(`G${start + 1}`).value = `Người nhận hàng:`
    worksheet.getCell(`G${start + 1}`).font = { name: `Times New Roman` }


    const output = await workbook.xlsx.writeBuffer()

    revalidatePath(`/xuat-hang`)
    return {
      fileName: `pxh-${delivery.soPhieu}-${customerCode}.xlsx`,
      data: Buffer.from(output as unknown as Uint8Array).toString(`base64`),
      soPhieu: delivery.soPhieu,
    }
  } catch (error) {
    return fail(error)
  }
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
