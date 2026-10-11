export { cn } from "cn"

export function formatPrice(value: string | number) {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(number)
    : String(value)
}
