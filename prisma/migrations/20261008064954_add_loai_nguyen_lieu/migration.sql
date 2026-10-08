/*
  Warnings:

  - Added the required column `loai` to the `nguyen_lieu` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "nguyen_lieu" ADD COLUMN     "loai" TEXT NOT NULL;
