'use server'

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/actions/users/data"
import { fail } from "@/lib/utils"

export async function listSanXuat(search = ``, page = 1, pageSize = 10) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.SanXuatWhereInput | undefined = query
    ? {
        OR: [
          { mskh: { contains: query, mode: `insensitive` } },
          { khachHang: { ten: { contains: query, mode: `insensitive` } } },
          { sanPham: { mssp: { contains: query, mode: `insensitive` } } },
        ],
      }
    : undefined

  const [rows, total] = await Promise.all([
    prisma.sanXuat.findMany({
      where,
      include: {
        khachHang: {
          select: {
            mskh: true,
            ten: true,
            tenCongTy: true,
          },
        },
        sanPham: {
          include: {
            nguyenLieu: {
              orderBy: { tenNguyenLieu: `asc` },
            },
          },
        },
      },
      orderBy: { id: `desc` },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sanXuat.count({ where }),
  ])

  const items = rows.map((row) => ({
    id: row.id,
    mskh: row.mskh,
    tenKhachHang: row.khachHang.ten,
    tenCongTy: row.khachHang.tenCongTy,
    ngaySanXuat: row.ngaySanXuat.toISOString(),
    mssp: row.sanPham?.mssp ?? ``,
    tenThuongMai: row.sanPham?.tenThuongMai ?? null,
    tenPhanBon: row.sanPham?.tenPhanBon ?? null,
    sanPham: row.sanPham
      ? {
          mssp: row.sanPham.mssp,
          tenThuongMai: row.sanPham.tenThuongMai,
          tenPhanBon: row.sanPham.tenPhanBon,
          donGia: row.sanPham.donGia,
          tiTrong: row.sanPham.tiTrong,
          khoiLuong: row.sanPham.khoiLuong,
          nguyenLieu: row.sanPham.nguyenLieu.map((nl) => ({
            id: nl.id,
            tenNguyenLieu: nl.tenNguyenLieu,
            donGia: nl.donGia,
            dinhLuong: nl.dinhLuong,
            tongTien: nl.tongTien,
          })),
        }
      : null,
  }))

  return { items, total }
}

export async function listProductsWithRecipeForCustomer(mskh: string) {
  await requireSession()

  const products = await prisma.sanPham.findMany({
    where: { mskh },
    orderBy: { mssp: `asc` },
    select: {
      mssp: true,
      tenPhanBon: true,
      tenThuongMai: true,
      donGia: true,
      tiTrong: true,
      khoiLuong: true,
      nguyenLieu: {
        include: {
          nguyenLieu: {
            include: {
              gia: {
                orderBy: { ngay: `desc` },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  return products.map((p) => ({
    mssp: p.mssp,
    tenPhanBon: p.tenPhanBon,
    tenThuongMai: p.tenThuongMai,
    donGia: p.donGia,
    tiTrong: p.tiTrong,
    khoiLuong: p.khoiLuong,
    nguyenLieu: p.nguyenLieu.map((nlItem) => ({
      nguyenLieuId: nlItem.nguyenLieuId,
      tenNguyenLieu: nlItem.nguyenLieu.ten,
      donGia: nlItem.nguyenLieu.gia[0]?.donGia ?? 0,
      dinhLuong: Number(nlItem.dinhLuong),
    })),
  }))
}

export async function createSanXuat(data: {
  mskh: string
  mssp: string
  massOrVolume: number
}) {
  await requireSession()

  const customerCode = data.mskh?.trim()
  const productCode = data.mssp?.trim()
  const massOrVolume = Number(data.massOrVolume)

  if (!customerCode) {
    return { error: `Khách hàng là bắt buộc` }
  }

  if (!productCode) {
    return { error: `Sản phẩm là bắt buộc` }
  }

  if (!massOrVolume || isNaN(massOrVolume) || massOrVolume <= 0) {
    return { error: `Khối lượng / thể tích phải là số lớn hơn 0` }
  }

  try {
    const product = await prisma.sanPham.findFirst({
      where: { mssp: productCode, mskh: customerCode },
      include: {
        nguyenLieu: {
          include: {
            nguyenLieu: {
              include: {
                gia: {
                  orderBy: { ngay: `desc` },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    if (!product) {
      return { error: `Sản phẩm không thuộc khách hàng đã chọn` }
    }

    const totalMass =
      product.tiTrong && product.tiTrong > 0
        ? massOrVolume * product.tiTrong
        : massOrVolume

    const totalMassCongThuc = product.nguyenLieu.reduce(
      (sum, item) => sum + Number(item.dinhLuong),
      0,
    )

    const nguyenLieuList = product.nguyenLieu.map((nlItem) => {
      const tenNguyenLieu = nlItem.nguyenLieu.ten
      const donGia = nlItem.nguyenLieu.gia[0]?.donGia ?? 0
      const recipeDinhLuong = Number(nlItem.dinhLuong)
      const consumed =
        totalMassCongThuc > 0
          ? (totalMass / totalMassCongThuc) * recipeDinhLuong
          : 0
      const dinhLuong = Number(consumed.toFixed(3))
      const tongTien = Math.round(dinhLuong * donGia)
      return {
        tenNguyenLieu,
        donGia,
        dinhLuong,
        tongTien,
      }
    })

    const created = await prisma.sanXuat.create({
      data: {
        mskh: customerCode,
        sanPham: {
          create: {
            mssp: product.mssp,
            tenThuongMai: product.tenThuongMai,
            tenPhanBon: product.tenPhanBon,
            donGia: product.donGia,
            tiTrong: product.tiTrong,
            khoiLuong: totalMass,
            nguyenLieu: {
              create: nguyenLieuList,
            },
          },
        },
      },
    })

    revalidatePath(`/san-xuat`)
    return { success: true, id: created.id }
  } catch (error) {
    return fail(error)
  }
}

export async function exportSanXuatExcel(id: number) {
  await requireSession()
  try {
    const sanXuat = await prisma.sanXuat.findUnique({
      where: { id },
      include: {
        khachHang: true,
        sanPham: {
          include: {
            nguyenLieu: true,
          },
        },
      },
    })
    if (!sanXuat) {
      return { error: `Không tìm thấy lệnh sản xuất #${id}` }
    }
    // Return placeholder data for user to bind logic
    return {
      message: `Xuất lệnh sản xuất #${id}`,
      id: sanXuat.id,
    }
  } catch (error) {
    return fail(error)
  }
}
