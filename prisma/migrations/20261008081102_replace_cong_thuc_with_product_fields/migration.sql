/*
  Warnings:

  - The primary key for the `cong_thuc_nguyen_lieu` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `congThucId` on the `cong_thuc_nguyen_lieu` table. All the data in the column will be lost.
  - You are about to drop the column `congThucId` on the `san_pham` table. All the data in the column will be lost.
  - You are about to drop the `cong_thuc` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `mssp` to the `cong_thuc_nguyen_lieu` table without a default value. This is not possible if the table is not empty.
  - Added the required column `donGia` to the `san_pham` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quyCach` to the `san_pham` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quyCachThung` to the `san_pham` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenSanPham` to the `san_pham` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenThuongMai` to the `san_pham` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cong_thuc_nguyen_lieu" DROP CONSTRAINT "cong_thuc_nguyen_lieu_congThucId_fkey";

-- DropForeignKey
ALTER TABLE "san_pham" DROP CONSTRAINT "san_pham_congThucId_fkey";

-- DropIndex
DROP INDEX "san_pham_congThucId_key";

-- AlterTable
ALTER TABLE "cong_thuc_nguyen_lieu" DROP CONSTRAINT "cong_thuc_nguyen_lieu_pkey",
DROP COLUMN "congThucId",
ADD COLUMN     "mssp" TEXT NOT NULL,
ADD CONSTRAINT "cong_thuc_nguyen_lieu_pkey" PRIMARY KEY ("mssp", "nguyenLieuId");

-- AlterTable
ALTER TABLE "san_pham" DROP COLUMN "congThucId",
ADD COLUMN     "donGia" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "quyCach" TEXT NOT NULL,
ADD COLUMN     "quyCachThung" TEXT NOT NULL,
ADD COLUMN     "tenSanPham" TEXT NOT NULL,
ADD COLUMN     "tenThuongMai" TEXT NOT NULL;

-- DropTable
DROP TABLE "cong_thuc";

-- CreateTable
CREATE TABLE "nguyen_lieu_don_gia" (
    "id" TEXT NOT NULL,
    "nguyenLieuId" TEXT NOT NULL,
    "ngay" DATE NOT NULL,
    "donGia" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "nguyen_lieu_don_gia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nguyen_lieu_don_gia_nguyenLieuId_ngay_idx" ON "nguyen_lieu_don_gia"("nguyenLieuId", "ngay");

-- CreateIndex
CREATE UNIQUE INDEX "nguyen_lieu_don_gia_nguyenLieuId_ngay_key" ON "nguyen_lieu_don_gia"("nguyenLieuId", "ngay");

-- AddForeignKey
ALTER TABLE "cong_thuc_nguyen_lieu" ADD CONSTRAINT "cong_thuc_nguyen_lieu_mssp_fkey" FOREIGN KEY ("mssp") REFERENCES "san_pham"("mssp") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nguyen_lieu_don_gia" ADD CONSTRAINT "nguyen_lieu_don_gia_nguyenLieuId_fkey" FOREIGN KEY ("nguyenLieuId") REFERENCES "nguyen_lieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
