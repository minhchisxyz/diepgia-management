-- AlterTable
ALTER TABLE "xuat_hang_san_pham" ADD COLUMN     "diaChiGiaoHang" TEXT NOT NULL DEFAULT 'Nhận tại kho',
ADD COLUMN     "sdtChanh" TEXT,
ADD COLUMN     "soHangLe" INTEGER NOT NULL DEFAULT 0;
