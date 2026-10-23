"use client"

import { useState } from "react"
import { createThuTien } from "@/lib/actions/cong-no/data"
import { downloadFile, formatSoPhieu } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"

export type Customer = {
  mskh: string
  ten: string
  tenCongTy: string | null
}

export default function CongNoForm({
  customers,
  onSuccess,
}: {
  customers: Customer[]
  onSuccess?: () => void
}) {
  const [mskh, setMskh] = useState("")
  const [soTien, setSoTien] = useState("")
  const [lyDo, setLyDo] = useState("")
  const [noiNhan, setNoiNhan] = useState("")
  const [ngayThu, setNgayThu] = useState(() => new Date().toISOString().slice(0, 10))
  const [isSaving, setIsSaving] = useState(false)

  async function submit(formData: FormData) {
    const formMskh = (formData.get("mskh") as string) || mskh
    const formSoTien = (formData.get("soTien") as string) || soTien
    const formLyDo = (formData.get("lyDo") as string) ?? lyDo
    const formNoiNhan = (formData.get("noiNhan") as string) ?? noiNhan
    const formNgayThu = (formData.get("ngayThu") as string) || ngayThu

    if (!formMskh) {
      toast.error("Vui lòng chọn khách hàng")
      return
    }

    const amount = Number(formSoTien)
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Số tiền phải là số nguyên lớn hơn 0")
      return
    }

    setIsSaving(true)

    try {
      const result = await createThuTien({
        mskh: formMskh,
        soTien: amount,
        lyDo: formLyDo,
        noiNhan: formNoiNhan,
        ngayThu: formNgayThu,
      })

      if ("error" in result) {
        toast.error(result.error ?? "Không thể tạo phiếu thu tiền")
        return
      }

      downloadFile(result.data, result.fileName)

      toast.success(`Đã tạo phiếu thu tiền số ${formatSoPhieu(result.soPhieu)}`)
      setMskh("")
      setSoTien("")
      setLyDo("")
      setNoiNhan("")
      setNgayThu(new Date().toISOString().slice(0, 10))
      onSuccess?.()
    } catch {
      toast.error("Không thể tạo phiếu thu tiền")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <form action={submit} className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Khách hàng (*)
          <Select
            name="mskh"
            value={mskh}
            onValueChange={(val) => setMskh(val ?? "")}
            required
          >
            <SelectTrigger className="w-full h-10 border-zinc-300 bg-white">
              <SelectValue placeholder="Chọn khách hàng" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.mskh} value={customer.mskh}>
                  {customer.mskh}-{customer.ten}
                  {customer.tenCongTy ? `-${customer.tenCongTy}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Ngày thu (*)
          <input
            type="date"
            name="ngayThu"
            value={ngayThu}
            onChange={(event) => setNgayThu(event.target.value)}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Số tiền (*)
          <input
            type="number"
            min="1"
            step="1"
            name="soTien"
            value={soTien}
            onChange={(event) => setSoTien(event.target.value)}
            placeholder="Nhập số tiền"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Nơi nhận (*)
          <input
            type="text"
            name="noiNhan"
            value={noiNhan}
            onChange={(event) => setNoiNhan(event.target.value)}
            placeholder="Nhập nơi nhận tiền"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 sm:col-span-2">
          Lý do thu (*)
          <input
            type="text"
            name="lyDo"
            value={lyDo}
            onChange={(event) => setLyDo(event.target.value)}
            placeholder="Nhập lý do thu tiền"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-green-900 px-5 py-2 font-medium text-white hover:bg-green-700 hover:cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "Đang lưu..." : "Tạo phiếu thu"}
          </button>
        </div>
      </form>
    </div>
  )
}
