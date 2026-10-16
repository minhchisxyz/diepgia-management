/*
  Warnings:

  - Changed the type of `loai` on the `NhapHang` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LoaiHangNhap" AS ENUM ('NGUYEN_LIEU', 'VAT_TU');

-- AlterTable
ALTER TABLE "NhapHang" DROP COLUMN "loai",
ADD COLUMN     "loai" "LoaiHangNhap" NOT NULL;

-- DropEnum
DROP TYPE "LoaiNhapHang";
