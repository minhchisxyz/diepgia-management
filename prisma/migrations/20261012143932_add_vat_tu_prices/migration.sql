-- CreateTable
CREATE TABLE "vat_tu_don_gia" (
    "id" TEXT NOT NULL,
    "ms" TEXT NOT NULL,
    "ngay" DATE NOT NULL,
    "donGia" INTEGER NOT NULL,

    CONSTRAINT "vat_tu_don_gia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vat_tu_don_gia_ms_ngay_idx" ON "vat_tu_don_gia"("ms", "ngay");

-- CreateIndex
CREATE UNIQUE INDEX "vat_tu_don_gia_ms_ngay_key" ON "vat_tu_don_gia"("ms", "ngay");

-- AddForeignKey
ALTER TABLE "vat_tu_don_gia" ADD CONSTRAINT "vat_tu_don_gia_ms_fkey" FOREIGN KEY ("ms") REFERENCES "vat_tu"("ms") ON DELETE CASCADE ON UPDATE CASCADE;
