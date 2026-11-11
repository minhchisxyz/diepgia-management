"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import {
  BangCongNoResult,
  BangCongNoRow,
  exportCongNoExcel,
  getBangCongNo,
  listThuTien,
  ThuTienRow,
  ThuTienSortKey,
} from "@/lib/actions/cong-no/data"
import { downloadFile, formatPrice } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import CongNoForm, { Customer } from "./form"
import CongNoCreateForm from "./cong-no-create-form"
import CongNoTable, { SortKey } from "./table"
import ThuTienTable from "./thu-tien-table"
import CongNoSkeleton from "./skeleton"
import { ExcelButton } from "@/components/buttons"

export default function CongNoManager({
  customers: initialCustomers = [],
  customersPromise,
  initialDataPromise,
  initialThuTienPromise,
}: {
  customers?: Customer[]
  customersPromise?: Promise<Customer[]>
  initialDataPromise?: Promise<BangCongNoResult>
  initialThuTienPromise?: Promise<{ items: ThuTienRow[]; total: number; totalSoTien?: number; error?: string }>
}) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [selectedMskh, setSelectedMskh] = useState("")
  const today = new Date()
  const [startDate, setStartDate] = useState(`${today.getFullYear()}-${today.getMonth() + 1}-01`)
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))

  // Toggle between "Công nợ" and "Thu tiền" tables
  const [showThuTien, setShowThuTien] = useState(false)

  // CongNo table state
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "ngay",
    direction: "desc",
  })
  const [congNo, setCongNo] = useState(0)
  const [congNoDauKy, setCongNoDauKy] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [dataPromise, setDataPromise] = useState<
    Promise<{ items: BangCongNoRow[]; total: number; congNo: number; congNoDauKy: number }>
  >(() => initialDataPromise ?? Promise.resolve({ items: [], total: 0, congNo: 0, congNoDauKy: 0 }))

  // ThuTien table state
  const [thuTienPage, setThuTienPage] = useState(1)
  const [thuTienSort, setThuTienSort] = useState<{ key: ThuTienSortKey; direction: "asc" | "desc" }>({
    key: "soPhieu",
    direction: "desc",
  })
  const [totalThuTien, setTotalThuTien] = useState(0)
  const [thuTienDataPromise, setThuTienDataPromise] = useState<
    Promise<{ items: ThuTienRow[]; total: number; totalSoTien?: number; error?: string }>
  >(() => initialThuTienPromise ?? Promise.resolve({ items: [], total: 0, totalSoTien: 0 }))

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    let active = true
    if (customersPromise) {
      customersPromise.then((data) => {
        if (active) setCustomers(data)
      })
    }
    return () => {
      active = false
    }
  }, [customersPromise])

  // Sync initial congNo and congNoDauKy when initialDataPromise resolves
  useEffect(() => {
    let active = true
    if (initialDataPromise) {
      initialDataPromise.then((res) => {
        if (active && res && !res.error) {
          setCongNo(res.congNo)
          setCongNoDauKy(res.congNoDauKy)
          setHasSearched(true)
        }
      })
    }
    return () => {
      active = false
    }
  }, [initialDataPromise])

  const fetchCongNoData = useCallback(
    (
      customerCode: string,
      start: string,
      end: string,
      targetPage = 1,
      currentSort = sort,
    ) => {
      if (!start || !end) {
        toast.error("Vui lòng chọn ngày bắt đầu và ngày kết thúc")
        return
      }

      setHasSearched(true)

      const promise = getBangCongNo({
        mskh: customerCode || undefined,
        startDate: start,
        endDate: end,
        page: targetPage,
        pageSize: 10,
        sort: currentSort,
      })
        .then((res) => {
          if (res.error) {
            toast.error(res.error)
            return { items: [], total: 0, congNo: 0, congNoDauKy: 0 }
          }
          setCongNo(res.congNo)
          setCongNoDauKy(res.congNoDauKy)
          return {
            items: res.items,
            total: res.total,
            congNo: res.congNo,
            congNoDauKy: res.congNoDauKy,
          }
        })
        .catch(() => {
          toast.error("Không thể tải bảng công nợ")
          return { items: [], total: 0, congNo: 0, congNoDauKy: 0 }
        })

      setDataPromise(promise)
    },
    [sort],
  )

  const fetchThuTienData = useCallback(
    (
      customerCode: string,
      start: string,
      end: string,
      targetPage = 1,
      currentSort = thuTienSort,
    ) => {
      if (!start || !end) {
        toast.error("Vui lòng chọn ngày bắt đầu và ngày kết thúc")
        return
      }

      const promise = listThuTien({
        mskh: customerCode || undefined,
        startDate: start,
        endDate: end,
        page: targetPage,
        pageSize: 10,
        sort: currentSort,
      })
        .then((res) => {
          if (res.error) {
            toast.error(res.error)
            return { items: [], total: 0, totalSoTien: 0 }
          }
          setTotalThuTien(res.totalSoTien)
          return {
            items: res.items,
            total: res.total,
            totalSoTien: res.totalSoTien,
          }
        })
        .catch(() => {
          toast.error("Không thể tải danh sách thu tiền")
          return { items: [], total: 0, totalSoTien: 0 }
        })

      setThuTienDataPromise(promise)
    },
    [thuTienSort],
  )

  const handleTra = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (showThuTien) {
      setThuTienPage(1)
      fetchThuTienData(selectedMskh, startDate, endDate, 1, thuTienSort)
    } else {
      setPage(1)
      fetchCongNoData(selectedMskh, startDate, endDate, 1, sort)
    }
  }, [showThuTien, selectedMskh, startDate, endDate, thuTienSort, sort, fetchThuTienData, fetchCongNoData])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!startDate || !endDate) return

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      if (showThuTien) {
        setThuTienPage(1)
        fetchThuTienData(selectedMskh, startDate, endDate, 1, thuTienSort)
      } else {
        setPage(1)
        fetchCongNoData(selectedMskh, startDate, endDate, 1, sort)
      }
    }, 200)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [selectedMskh, startDate, endDate, showThuTien, thuTienSort, sort, fetchThuTienData, fetchCongNoData])

  function handleToggleMode(nextMode: boolean) {
    setShowThuTien(nextMode)
    if (nextMode) {
      setThuTienPage(1)
      fetchThuTienData(selectedMskh, startDate, endDate, 1, thuTienSort)
    } else {
      setPage(1)
      fetchCongNoData(selectedMskh, startDate, endDate, 1, sort)
    }
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    fetchCongNoData(selectedMskh, startDate, endDate, newPage, sort)
  }

  function handleSortChange(nextSort: { key: SortKey; direction: "asc" | "desc" }) {
    setSort(nextSort)
    setPage(1)
    fetchCongNoData(selectedMskh, startDate, endDate, 1, nextSort)
  }

  function handleThuTienPageChange(newPage: number) {
    setThuTienPage(newPage)
    fetchThuTienData(selectedMskh, startDate, endDate, newPage, thuTienSort)
  }

  function handleThuTienSortChange(nextSort: { key: ThuTienSortKey; direction: "asc" | "desc" }) {
    setThuTienSort(nextSort)
    setThuTienPage(1)
    fetchThuTienData(selectedMskh, startDate, endDate, 1, nextSort)
  }

  function handleFormSuccess() {
    if (startDate && endDate) {
      if (showThuTien) {
        fetchThuTienData(selectedMskh, startDate, endDate, thuTienPage, thuTienSort)
      }
      fetchCongNoData(selectedMskh, startDate, endDate, page, sort)
    }
  }

  async function exportExcel() {
    if (!startDate || !endDate) {
      toast.error("Vui lòng chọn ngày bắt đầu và ngày kết thúc")
      return
    }

    const promise = exportCongNoExcel(
      selectedMskh || undefined,
      startDate,
      endDate,
    ).then((res) => {
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (res.data && res.fileName) {
        downloadFile(res.data, res.fileName)
      }
    })

    toast.promise(promise, {
      loading: "Đang xuất bảng công nợ...",
      success: "Đã xuất bảng công nợ thành công",
      error: (err) => `Không thể xuất bảng công nợ: ${err?.message || err}`,
    })
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <Tabs defaultValue="thu-tien" className="w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4">
              <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
                Quản lý công nợ
              </h1>
              <TabsList>
                <TabsTrigger value="thu-tien">Thu tiền</TabsTrigger>
                <TabsTrigger value="cong-no">Tạo công nợ</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="thu-tien" className="pt-2">
              <CongNoForm customers={customers} onSuccessAction={handleFormSuccess} />
            </TabsContent>
            <TabsContent value="cong-no" className="pt-2">
              <CongNoCreateForm customers={customers} onSuccessAction={handleFormSuccess} />
            </TabsContent>
          </Tabs>
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-4 sm:p-6 overflow-x-auto">
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <h2 className="text-xl font-semibold text-zinc-900 whitespace-nowrap shrink-0">
                {showThuTien ? "Danh sách thu tiền" : "Bảng công nợ"}
              </h2>
              {!showThuTien && <ExcelButton onClick={exportExcel} />}

              {/* Switch to toggle between Bảng công nợ and Thu tiền */}
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-1.5 select-none">
                <span
                  onClick={() => handleToggleMode(false)}
                  className={`text-xs cursor-pointer ${
                    !showThuTien ? "font-semibold text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  Công nợ
                </span>
                <Switch
                  checked={showThuTien}
                  onCheckedChange={handleToggleMode}
                  aria-label="Chuyển bảng thu tiền"
                />
                <span
                  onClick={() => handleToggleMode(true)}
                  className={`text-xs cursor-pointer ${
                    showThuTien ? "font-semibold text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  Thu tiền
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <Select
                value={selectedMskh || "ALL"}
                onValueChange={(val) => setSelectedMskh(val === "ALL" ? "" : (val ?? ""))}
              >
                <SelectTrigger className="w-44 sm:w-56 truncate rounded-lg border-zinc-300 bg-white">
                  <SelectValue placeholder="Tất cả khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả khách hàng</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.mskh} value={customer.mskh}>
                      {customer.mskh} - {customer.ten}
                      {customer.tenCongTy ? ` - ${customer.tenCongTy}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label className="flex items-center gap-1 text-sm text-zinc-700 whitespace-nowrap shrink-0">
                <span>Từ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </label>

              <label className="flex items-center gap-1 text-sm text-zinc-700 whitespace-nowrap shrink-0">
                <span>Đến:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </label>

              {showThuTien ? (
                <div className="text-sm font-semibold text-zinc-900 whitespace-nowrap shrink-0">
                  Tổng thu:{" "}
                  <span className="text-emerald-700">
                    {formatPrice(totalThuTien)} đ
                  </span>
                </div>
              ) : (
                <>
                  <div className="text-sm font-semibold text-zinc-900 whitespace-nowrap shrink-0">
                    Đầu kỳ:{" "}
                    <span
                      className={
                        congNoDauKy > 0
                          ? "text-amber-600"
                          : congNoDauKy < 0
                            ? "text-blue-600"
                            : "text-zinc-900"
                      }
                    >
                      {hasSearched ? `${formatPrice(congNoDauKy)} đ` : "0 đ"}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-zinc-900 whitespace-nowrap shrink-0">
                    Công nợ:{" "}
                    <span
                      className={
                        congNo > 0
                          ? "text-amber-600"
                          : congNo < 0
                            ? "text-blue-600"
                            : "text-zinc-900"
                      }
                    >
                      {hasSearched ? `${formatPrice(congNo)} đ` : "0 đ"}
                    </span>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleTra}
                disabled={!startDate || !endDate}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Tra
              </button>
            </div>
          </div>

          <Suspense fallback={<CongNoSkeleton />}>
            {showThuTien ? (
              <ThuTienTable
                dataPromise={thuTienDataPromise}
                page={thuTienPage}
                sort={thuTienSort}
                onSortChangeAction={handleThuTienSortChange}
                onPageChangeAction={handleThuTienPageChange}
              />
            ) : (
              <CongNoTable
                dataPromise={dataPromise}
                hasSearched={hasSearched}
                page={page}
                sort={sort}
                onSortChangeAction={handleSortChange}
                onPageChangeAction={handlePageChange}
              />
            )}
          </Suspense>
        </section>
      </div>
    </main>
  )
}
