/*
  Warnings:

  - Added the required column `diaChi` to the `khach_hang` table without a default value. This is not possible if the table is not empty.
  - Added the required column `soDienThoai` to the `khach_hang` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ten` to the `khach_hang` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "khach_hang" ADD COLUMN     "diaChi" TEXT NOT NULL,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "soDienThoai" TEXT NOT NULL,
ADD COLUMN     "ten" TEXT NOT NULL;
