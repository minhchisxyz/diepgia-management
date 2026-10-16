/*
  Warnings:

  - You are about to drop the column `giaTien` on the `xuat_hang_san_pham` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "xuat_hang_san_pham" DROP COLUMN "giaTien",
ADD COLUMN     "tongTien" INTEGER NOT NULL DEFAULT 0;
