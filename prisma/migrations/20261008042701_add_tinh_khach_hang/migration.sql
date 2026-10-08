/*
  Warnings:

  - Added the required column `tinh` to the `khach_hang` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "khach_hang" ADD COLUMN     "tinh" TEXT NOT NULL;
