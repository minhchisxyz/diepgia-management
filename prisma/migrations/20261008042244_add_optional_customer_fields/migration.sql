-- AlterTable
ALTER TABLE "khach_hang" ADD COLUMN     "maSoThue" TEXT,
ADD COLUMN     "tenCongTy" TEXT,
ALTER COLUMN "soDienThoai" DROP NOT NULL;
