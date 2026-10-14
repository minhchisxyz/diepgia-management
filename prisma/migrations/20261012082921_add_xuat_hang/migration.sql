-- CreateTable
CREATE TABLE "xuat_hang" (
    "soPhieu" SERIAL NOT NULL,
    "mskh" TEXT NOT NULL,
    "ngayXuatHang" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nguoiLapPhieuId" TEXT NOT NULL,

    CONSTRAINT "xuat_hang_pkey" PRIMARY KEY ("soPhieu")
);

-- CreateTable
CREATE TABLE "xuat_hang_san_pham" (
    "soPhieu" INTEGER NOT NULL,
    "mssp" TEXT NOT NULL,
    "soLuongThung" INTEGER NOT NULL,

    CONSTRAINT "xuat_hang_san_pham_pkey" PRIMARY KEY ("soPhieu","mssp")
);

-- AddForeignKey
ALTER TABLE "xuat_hang" ADD CONSTRAINT "xuat_hang_mskh_fkey" FOREIGN KEY ("mskh") REFERENCES "khach_hang"("mskh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xuat_hang" ADD CONSTRAINT "xuat_hang_nguoiLapPhieuId_fkey" FOREIGN KEY ("nguoiLapPhieuId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xuat_hang_san_pham" ADD CONSTRAINT "xuat_hang_san_pham_soPhieu_fkey" FOREIGN KEY ("soPhieu") REFERENCES "xuat_hang"("soPhieu") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xuat_hang_san_pham" ADD CONSTRAINT "xuat_hang_san_pham_mssp_fkey" FOREIGN KEY ("mssp") REFERENCES "san_pham"("mssp") ON DELETE RESTRICT ON UPDATE CASCADE;
