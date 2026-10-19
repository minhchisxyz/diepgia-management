-- CreateTable
CREATE TABLE "xuat_hang_nguyen_lieu" (
    "id" TEXT NOT NULL,
    "soPhieu" INTEGER NOT NULL,
    "tenNguyenLieu" TEXT NOT NULL,
    "donGia" INTEGER NOT NULL,
    "soLuong" DECIMAL(12,3) NOT NULL,
    "tongTien" INTEGER NOT NULL,

    CONSTRAINT "xuat_hang_nguyen_lieu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xuat_hang_vat_tu" (
    "id" TEXT NOT NULL,
    "soPhieu" INTEGER NOT NULL,
    "maVatTu" TEXT NOT NULL,
    "donGia" INTEGER NOT NULL,
    "soLuong" INTEGER NOT NULL,
    "tongTien" INTEGER NOT NULL,

    CONSTRAINT "xuat_hang_vat_tu_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "xuat_hang_nguyen_lieu" ADD CONSTRAINT "xuat_hang_nguyen_lieu_soPhieu_fkey" FOREIGN KEY ("soPhieu") REFERENCES "xuat_hang"("soPhieu") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xuat_hang_vat_tu" ADD CONSTRAINT "xuat_hang_vat_tu_soPhieu_fkey" FOREIGN KEY ("soPhieu") REFERENCES "xuat_hang"("soPhieu") ON DELETE CASCADE ON UPDATE CASCADE;
