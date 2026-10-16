/*
  Warnings:

  - You are about to drop the column `diaChiGiaoHang` on the `xuat_hang_san_pham` table. All the data in the column will be lost.
  - You are about to drop the column `sdtChanh` on the `xuat_hang_san_pham` table. All the data in the column will be lost.
  - Added the required column `donGia` to the `xuat_hang_san_pham` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quyCach` to the `xuat_hang_san_pham` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quyCachThung` to the `xuat_hang_san_pham` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenPhanBon` to the `xuat_hang_san_pham` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenThuongMai` to the `xuat_hang_san_pham` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "xuat_hang_san_pham" DROP CONSTRAINT "xuat_hang_san_pham_mssp_fkey";

-- AlterTable
ALTER TABLE "xuat_hang" ADD COLUMN     "diaChiGiaoHang" TEXT NOT NULL DEFAULT 'Nhận tại kho',
ADD COLUMN     "sdtChanh" TEXT;

-- AlterTable
ALTER TABLE "xuat_hang_san_pham" DROP COLUMN "diaChiGiaoHang",
DROP COLUMN "sdtChanh",
ADD COLUMN     "donGia" INTEGER NOT NULL,
ADD COLUMN     "quyCach" TEXT NOT NULL,
ADD COLUMN     "quyCachThung" INTEGER NOT NULL,
ADD COLUMN     "tenPhanBon" TEXT NOT NULL,
ADD COLUMN     "tenThuongMai" TEXT NOT NULL;
