-- CreateTable
CREATE TABLE "thu_tien" (
    "soPhieu" SERIAL NOT NULL,
    "ngayThu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mskh" TEXT NOT NULL,
    "soTien" INTEGER NOT NULL,
    "lyDo" TEXT NOT NULL,
    "noiNhan" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "thu_tien_pkey" PRIMARY KEY ("soPhieu")
);

-- AddForeignKey
ALTER TABLE "thu_tien" ADD CONSTRAINT "thu_tien_mskh_fkey" FOREIGN KEY ("mskh") REFERENCES "khach_hang"("mskh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thu_tien" ADD CONSTRAINT "thu_tien_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
