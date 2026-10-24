"use client"

import Image from "next/image"

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 p-8">
      <main className="mx-auto w-full max-w-8xl h-full">
        <div className="flex items-center justify-center h-full">
          <div className="w-full bg-white p-8 sm:p-12 shadow-sm rounded-2xl flex flex-col items-center justify-center gap-8">
            <Image
              src="/logo.png"
              alt="Diệp Gia"
              width={700}
              height={390}
              className="max-h-72 sm:max-h-80 md:max-h-96 w-auto object-contain"
              priority
            />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#F52D05] text-center">
              DIỆP GIA - THÀNH ĐẠT - HUY HOÀNG
            </h1>
          </div>
        </div>
      </main>
    </div>
  )
}
