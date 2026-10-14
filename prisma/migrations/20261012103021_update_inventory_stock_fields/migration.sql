/*
  Warnings:

  - You are about to drop the column `loai` on the `vat_tu` table. All the data in the column will be lost.
  - You are about to drop the column `mskh` on the `vat_tu` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "vat_tu" DROP CONSTRAINT "vat_tu_mskh_fkey";

-- AlterTable
ALTER TABLE "nguyen_lieu" ADD COLUMN     "kho" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "vat_tu" DROP COLUMN "loai",
DROP COLUMN "mskh",
ADD COLUMN     "kho" INTEGER NOT NULL DEFAULT 0;
