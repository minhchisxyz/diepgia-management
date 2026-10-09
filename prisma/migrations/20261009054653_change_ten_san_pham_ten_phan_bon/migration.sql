/*
  Warnings:

  - You are about to alter the column `donGia` on the `nguyen_lieu_don_gia` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,3)` to `Integer`.
  - You are about to drop the column `tenSanPham` on the `san_pham` table. All the data in the column will be lost.
  - You are about to alter the column `donGia` on the `san_pham` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,3)` to `Integer`.
  - Added the required column `tenPhanBon` to the `san_pham` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `quyCachThung` on the `san_pham` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "nguyen_lieu_don_gia" ALTER COLUMN "donGia" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "san_pham" DROP COLUMN "tenSanPham",
ADD COLUMN     "tenPhanBon" TEXT NOT NULL,
ALTER COLUMN "donGia" SET DATA TYPE INTEGER,
DROP COLUMN "quyCachThung",
ADD COLUMN     "quyCachThung" INTEGER NOT NULL;
