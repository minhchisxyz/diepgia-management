export { cn } from "cn"

export function formatPrice(value: string | number) {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(number)
    : String(value)
}

export function formatDateTime(date: Date) {

  // Pad single digits with leading zeros
  const pad = (num: number) => String(num).padStart(2, '0')

  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1) // Months are 0-indexed in JS
  const year = date.getFullYear()

  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

export function formatSoPhieu(soPhieu: number) {
  return `${String(soPhieu).padStart(6, '0')}`
}

export function fail(error: unknown) {
  return {
    error: error instanceof Error
        ? error.message
        : `Không thể thực hiện thao tác`,
  }
}
