"use client"

import { FormEvent, useEffect, useState } from "react"

type Ingredient = { id: string; ten: string; donVi: string; loai: string }
type Recipe = { id: string; nguyenLieu: { giaTri: string; nguyenLieu: Ingredient }[] }
type Row = { nguyenLieuId: string; giaTri: string }

export default function CongThucManager() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [rows, setRows] = useState<Row[]>([{ nguyenLieuId: "", giaTri: "" }])
  const [message, setMessage] = useState("")

  async function load() {
    const [ingredientsResponse, recipesResponse] = await Promise.all([fetch("/api/nguyen-lieu"), fetch("/api/cong-thuc")])
    if (ingredientsResponse.ok) setIngredients(await ingredientsResponse.json() as Ingredient[])
    if (recipesResponse.ok) setRecipes(await recipesResponse.json() as Recipe[])
  }

  useEffect(() => {
    let active = true
    Promise.all([fetch("/api/nguyen-lieu"), fetch("/api/cong-thuc")])
      .then(async ([ingredientsResponse, recipesResponse]) => {
        if (!active) return
        if (ingredientsResponse.ok) setIngredients(await ingredientsResponse.json() as Ingredient[])
        if (recipesResponse.ok) setRecipes(await recipesResponse.json() as Recipe[])
      })
      .catch(() => {
        if (active) setMessage("Không thể tải dữ liệu công thức")
      })
    return () => {
      active = false
    }
  }, [])

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch("/api/cong-thuc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: rows.map((row) => ({ nguyenLieuId: row.nguyenLieuId, giaTri: Number(row.giaTri) })) }),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã tạo công thức" : result.error ?? "Không thể tạo công thức")
    if (response.ok) {
      setRows([{ nguyenLieuId: "", giaTri: "" }])
      await load()
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold sm:text-3xl">Công thức</h1>
          <form onSubmit={submit} className="mt-5 space-y-3">
            {rows.map((row, index) => <div key={index} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Nguyên liệu (*)
                <select value={row.nguyenLieuId} onChange={(event) => updateRow(index, "nguyenLieuId", event.target.value)} required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal">
                  <option value="">Chọn nguyên liệu</option>
                  {ingredients.map((item) => <option key={item.id} value={item.id}>{item.ten} - {item.loai} ({item.donVi})</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Giá trị (*)
                <input type="number" step="0.001" min="0.001" value={row.giaTri} onChange={(event) => updateRow(index, "giaTri", event.target.value)} placeholder="Nhập giá trị" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
              </label>
              <button type="button" onClick={() => setRows((current) => current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg border px-3 py-2 text-zinc-600">Xóa</button>
            </div>)}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setRows((current) => [...current, { nguyenLieuId: "", giaTri: "" }])} className="rounded-lg border px-4 py-2">Thêm nguyên liệu</button>
              <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white">Tạo công thức</button>
            </div>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold">Danh sách công thức</h2>
          <div className="mt-4 space-y-3">{recipes.map((recipe) => <div key={recipe.id} className="rounded-lg border border-zinc-100 p-4"><p className="font-medium">{recipe.id}</p><p className="mt-1 text-sm text-zinc-600">{recipe.nguyenLieu.map((row) => `${row.nguyenLieu.ten} - ${row.nguyenLieu.loai}: ${row.giaTri} ${row.nguyenLieu.donVi}`).join(" · ")}</p></div>)}</div>
        </section>
      </div>
    </main>
  )
}
