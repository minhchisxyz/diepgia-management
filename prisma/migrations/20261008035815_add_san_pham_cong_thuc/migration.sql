-- CreateTable
CREATE TABLE "san_pham" (
    "mssp" TEXT NOT NULL,
    "mskh" TEXT NOT NULL,
    "congThucId" TEXT NOT NULL,

    CONSTRAINT "san_pham_pkey" PRIMARY KEY ("mssp")
);

-- CreateTable
CREATE TABLE "cong_thuc" (
    "id" TEXT NOT NULL,

    CONSTRAINT "cong_thuc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nguyen_lieu" (
    "id" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "donVi" TEXT NOT NULL,

    CONSTRAINT "nguyen_lieu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cong_thuc_nguyen_lieu" (
    "congThucId" TEXT NOT NULL,
    "nguyenLieuId" TEXT NOT NULL,
    "giaTri" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "cong_thuc_nguyen_lieu_pkey" PRIMARY KEY ("congThucId","nguyenLieuId")
);

-- CreateIndex
CREATE UNIQUE INDEX "san_pham_congThucId_key" ON "san_pham"("congThucId");

-- AddForeignKey
ALTER TABLE "san_pham" ADD CONSTRAINT "san_pham_mskh_fkey" FOREIGN KEY ("mskh") REFERENCES "khach_hang"("mskh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "san_pham" ADD CONSTRAINT "san_pham_congThucId_fkey" FOREIGN KEY ("congThucId") REFERENCES "cong_thuc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cong_thuc_nguyen_lieu" ADD CONSTRAINT "cong_thuc_nguyen_lieu_congThucId_fkey" FOREIGN KEY ("congThucId") REFERENCES "cong_thuc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cong_thuc_nguyen_lieu" ADD CONSTRAINT "cong_thuc_nguyen_lieu_nguyenLieuId_fkey" FOREIGN KEY ("nguyenLieuId") REFERENCES "nguyen_lieu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
