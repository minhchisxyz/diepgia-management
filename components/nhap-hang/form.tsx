"use client"

export type NhapHangItem = {
  id: string
  ngayNhap: string
  loai: "NGUYEN_LIEU" | "VAT_TU"
  maHangNhap: string
  donGia: number
  soLuong: number
  tongTien: number
}

