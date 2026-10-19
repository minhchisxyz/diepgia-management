-- AlterTable
ALTER TABLE "san_pham" ADD COLUMN "tiTrong" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "cong_thuc_nguyen_lieu" RENAME COLUMN "giaTri" TO "dinhLuong";
