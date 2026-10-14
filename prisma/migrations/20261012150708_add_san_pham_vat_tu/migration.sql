-- CreateTable
CREATE TABLE "san_pham_vat_tu" (
    "mssp" TEXT NOT NULL,
    "ms" TEXT NOT NULL,

    CONSTRAINT "san_pham_vat_tu_pkey" PRIMARY KEY ("mssp","ms")
);

-- AddForeignKey
ALTER TABLE "san_pham_vat_tu" ADD CONSTRAINT "san_pham_vat_tu_mssp_fkey" FOREIGN KEY ("mssp") REFERENCES "san_pham"("mssp") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "san_pham_vat_tu" ADD CONSTRAINT "san_pham_vat_tu_ms_fkey" FOREIGN KEY ("ms") REFERENCES "vat_tu"("ms") ON DELETE RESTRICT ON UPDATE CASCADE;
