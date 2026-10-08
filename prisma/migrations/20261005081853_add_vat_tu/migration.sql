-- CreateEnum
CREATE TYPE "LoaiVatTu" AS ENUM ('THUNG', 'CHAI', 'NHAN', 'TUI', 'BAO');

-- CreateTable
CREATE TABLE "vat_tu" (
    "ms" TEXT NOT NULL,
    "ten" "LoaiVatTu" NOT NULL,
    "loai" TEXT NOT NULL,

    CONSTRAINT "vat_tu_pkey" PRIMARY KEY ("ms")
);
