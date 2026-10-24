"use client"

import { useState } from "react"
import { createCustomer as createCustomerAction } from "@/lib/actions/khach-hang/data"
import { toast } from "@/components/ui/toast"
import { Spinner } from "@/components/ui/spinner"

export type KhachHang = {
  mskh: string
  ten: string
  tenCongTy: string | null
  diaChi: string | null
  tinh: string | null
  email: string | null
  maSoThue: string | null
  soDienThoai: string | null
  diaChiGiaoHang: string | null
  sdtChanh: string | null
}

export type CustomerDraft = {
  ten: string
  tenCongTy: string | null
  diaChi: string | null
  tinh: string | null
  email: string | null
  maSoThue: string | null
  soDienThoai: string | null
  diaChiGiaoHang: string | null
  sdtChanh: string | null
}

const emptyDraft: CustomerDraft = {
  ten: "",
  tenCongTy: "",
  diaChi: "",
  tinh: "",
  email: "",
  maSoThue: "",
  soDienThoai: "",
  diaChiGiaoHang: "",
  sdtChanh: "",
}

export default function KhachHangForm({
  onSuccess,
}: {
  onSuccess?: () => void
}) {
  const [mskh, setMskh] = useState("")
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function createKhachHang(formData: FormData) {
    const data = {
      mskh: (formData.get("mskh") as string)?.trim() || mskh,
      ten: (formData.get("ten") as string)?.trim() || draft.ten,
      tenCongTy: (formData.get("tenCongTy") as string)?.trim() || draft.tenCongTy,
      diaChi: (formData.get("diaChi") as string)?.trim() || draft.diaChi,
      tinh: (formData.get("tinh") as string)?.trim() || draft.tinh,
      email: (formData.get("email") as string)?.trim() || draft.email,
      maSoThue: (formData.get("maSoThue") as string)?.trim() || draft.maSoThue,
      soDienThoai: (formData.get("soDienThoai") as string)?.trim() || draft.soDienThoai,
      diaChiGiaoHang: (formData.get("diaChiGiaoHang") as string)?.trim() || draft.diaChiGiaoHang,
      sdtChanh: (formData.get("sdtChanh") as string)?.trim() || draft.sdtChanh,
    }

    if (!data.mskh) {
      toast.error("Vui lòng nhập mã khách hàng")
      return
    }
    if (!data.ten) {
      toast.error("Vui lòng nhập tên khách hàng")
      return
    }

    const label = `[${data.mskh}] - ${data.ten}`
    setIsSubmitting(true)
    try {
      const result = (await toast.promise(
        createCustomerAction(data) as Promise<{ error?: string }>,
        {
          loading: `Đang thêm khách hàng ${label}...`,
          success: `Thêm khách hàng ${label} thành công`,
          error: (err) => `Thêm khách hàng ${label} thất bại: ${err}`,
        }
      ))
      if (!result.error) {
        setMskh("")
        setDraft(emptyDraft)
        onSuccess?.()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <form action={createKhachHang} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Mã khách hàng (*)
          <input
            name="mskh"
            value={mskh}
            onChange={(event) => setMskh(event.target.value)}
            placeholder="Nhập mã khách hàng"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Tên (*)
          <input
            name="ten"
            value={draft.ten}
            onChange={(event) => setDraft({ ...draft, ten: event.target.value })}
            placeholder="Nhập tên khách hàng"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Tên công ty
          <input
            name="tenCongTy"
            value={draft.tenCongTy ?? ""}
            onChange={(event) => setDraft({ ...draft, tenCongTy: event.target.value })}
            placeholder="Nhập tên công ty"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Địa chỉ
          <input
            name="diaChi"
            value={draft.diaChi ?? ""}
            onChange={(event) => setDraft({ ...draft, diaChi: event.target.value })}
            placeholder="Nhập địa chỉ"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Tỉnh/Thành phố
          <input
            name="tinh"
            value={draft.tinh ?? ""}
            onChange={(event) => setDraft({ ...draft, tinh: event.target.value })}
            placeholder="Nhập tỉnh/thành phố"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Mã số thuế
          <input
            name="maSoThue"
            value={draft.maSoThue ?? ""}
            onChange={(event) => setDraft({ ...draft, maSoThue: event.target.value })}
            placeholder="Nhập mã số thuế"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Số điện thoại
          <input
            name="soDienThoai"
            value={draft.soDienThoai ?? ""}
            onChange={(event) => setDraft({ ...draft, soDienThoai: event.target.value })}
            placeholder="Nhập số điện thoại"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Địa chỉ giao hàng
          <input
            name="diaChiGiaoHang"
            value={draft.diaChiGiaoHang ?? ""}
            onChange={(event) => setDraft({ ...draft, diaChiGiaoHang: event.target.value })}
            placeholder="Nhập địa chỉ giao hàng"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Số điện thoại chành
          <input
            name="sdtChanh"
            value={draft.sdtChanh ?? ""}
            onChange={(event) => setDraft({ ...draft, sdtChanh: event.target.value })}
            placeholder="Nhập số điện thoại chành"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Email
          <input
            name="email"
            type="email"
            value={draft.email ?? ""}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            placeholder="Nhập email"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-green-900 px-5 py-2 font-medium text-white hover:bg-green-700 hover:cursor-pointer lg:col-span-4 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Spinner className="size-4" />
              <span>Đang thêm khách hàng...</span>
            </>
          ) : (
            "Thêm khách hàng"
          )}
        </button>
      </form>
    </div>
  )
}
