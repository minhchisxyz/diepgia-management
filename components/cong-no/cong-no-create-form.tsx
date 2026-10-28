"use client"

import { useState } from "react"
import { createCongNo } from "@/lib/actions/cong-no/data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { Spinner } from "@/components/ui/spinner"
import { Customer } from "./form"

export default function CongNoCreateForm({
  customers,
  onSuccess,
}: {
  customers: Customer[]
  onSuccess?: () => void
}) {
  const [mskh, setMskh] = useState("")
  const [tongTien, setTongTien] = useState("")
  const [noiDung, setNoiDung] = useState("")
  const [ngay, setNgay] = useState(() => new Date().toISOString().slice(0, 10))
  const [isSaving, setIsSaving] = useState(false)

  async function submit(formData: FormData) {
    const formMskh = (formData.get("mskh") as string) || mskh
    const formTongTien = (formData.get("tongTien") as string) || tongTien
    const formNoiDung = (formData.get("noiDung") as string) ?? noiDung
    const formNgay = (formData.get("ngay") as string) || ngay

    if (!formMskh) {
      toast.error("Vui lòng chọn khách hàng")
      return
    }

    const amount = Number(formTongTien)
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Số tiền phải là số nguyên lớn hơn 0")
      return
    }

    const trimmedNoiDung = formNoiDung.trim()
    if (!trimmedNoiDung) {
      toast.error("Vui lòng nhập nội dung công nợ")
      return
    }

    const customer = customers.find((c) => c.mskh === formMskh)
    const custLabel = customer ? `[${formMskh}] - ${customer.ten}` : `[${formMskh}]`

    setIsSaving(true)

    const promise = createCongNo({
      mskh: formMskh,
      tongTien: amount,
      noiDung: trimmedNoiDung,
      ngay: formNgay,
    })
      .then((result) => {
        if ("error" in result && result.error) {
          throw new Error(result.error)
        }
        setMskh("")
        setTongTien("")
        setNoiDung("")
        setNgay(new Date().toISOString().slice(0, 10))
        onSuccess?.()
        return result
      })
      .finally(() => {
        setIsSaving(false)
      })

    toast.promise(promise, {
      loading: `Đang tạo công nợ cho khách hàng ${custLabel}...`,
      success: `Đã tạo công nợ cho khách hàng ${custLabel} thành công`,
      error: (err) => `Không thể tạo công nợ: ${err?.message || err}`,
    })
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
          Ngày ghi (*)
          <input
            type="date"
            name="ngay"
            value={ngay}
            onChange={(event) => setNgay(event.target.value)}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Tổng tiền (*)
          <input
            type="number"
            min="1"
            step="1"
            name="tongTien"
            value={tongTien}
            onChange={(event) => setTongTien(event.target.value)}
            placeholder="Nhập tổng tiền"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 md:col-span-3">
          Nội dung (*)
          <input
            type="text"
            name="noiDung"
            value={noiDung}
            onChange={(event) => setNoiDung(event.target.value)}
            placeholder="Nhập nội dung công nợ"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>

        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-green-900 px-5 py-2 font-medium text-white hover:bg-green-700 hover:cursor-pointer disabled:opacity-50"
          >
            {isSaving && <Spinner className="size-4" />}
            {isSaving ? "Đang lưu..." : "Tạo công nợ"}
          </button>
        </div>
      </form>
    </div>
  )
}
