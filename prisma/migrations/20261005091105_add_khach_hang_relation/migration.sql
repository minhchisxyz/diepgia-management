/*
  Warnings:

  - Added the required column `mskh` to the `vat_tu` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "vat_tu" ADD COLUMN     "mskh" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "khach_hang" (
    "mskh" TEXT NOT NULL,

    CONSTRAINT "khach_hang_pkey" PRIMARY KEY ("mskh")
);

-- AddForeignKey
ALTER TABLE "vat_tu" ADD CONSTRAINT "vat_tu_mskh_fkey" FOREIGN KEY ("mskh") REFERENCES "khach_hang"("mskh") ON DELETE RESTRICT ON UPDATE CASCADE;
