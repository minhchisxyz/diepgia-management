-- CreateEnum
CREATE TYPE "LoaiNhapHang" AS ENUM ('NGUYEN_LIEU', 'VAT_TU');

-- CreateTable
CREATE TABLE "NhapHang" (
    "id" TEXT NOT NULL,
    "ngayNhap" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loai" "LoaiNhapHang" NOT NULL,
    "maHangNhap" TEXT NOT NULL,
    "donGia" INTEGER NOT NULL,
    "soLuong" INTEGER NOT NULL,
    "tongTien" INTEGER NOT NULL,

    CONSTRAINT "NhapHang_pkey" PRIMARY KEY ("id")
);
