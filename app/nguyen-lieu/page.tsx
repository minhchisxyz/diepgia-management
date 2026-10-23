import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { listIngredients } from "@/lib/actions/nguyen-lieu/data"
import NguyenLieuManager from "@/components/nguyen-lieu/manager"
import { Ingredient } from "@/components/nguyen-lieu/form"

export default async function NguyenLieuPage() {
  if (!await getSession()) redirect("/login")

  const initialDataPromise = listIngredients("") as Promise<{ items: Ingredient[]; total: number }>

  return <NguyenLieuManager initialDataPromise={initialDataPromise} />
}
