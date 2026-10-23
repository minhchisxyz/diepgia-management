export { cn } from "cn"

export function formatPrice(value: string | number) {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(number)
    : String(value)
}

export function formatNumber(value: number) {
  return value.toFixed(2)
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
  return `${String(soPhieu).padStart(4, '0')}`
}

export function fail(error: unknown) {
  return {
    error: error instanceof Error
        ? error.message
        : `Không thể thực hiện thao tác`,
  }
}

export function downloadFile(data: string, fileName: string) {
  const binary = Uint8Array.from(
      atob(data),
      (character) => character.charCodeAt(0),
  )
  const file = new Blob([binary], {
    type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
  })
  const url = URL.createObjectURL(file)
  const link = document.createElement(`a`)
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
const DON_VI = ["", "ngàn", "triệu", "tỉ"]

function readThreeDigits(number: number, hasHigherBlock: boolean): string {
  let result = ""
  const hundred = Math.floor(number / 100)
  const ten = Math.floor((number % 100) / 10)
  const unit = number % 10

  // Read hundred
  if (hasHigherBlock || hundred > 0) {
    result += `${CHU_SO[hundred]} trăm `
  }

  // Read ten & unit
  if (ten === 0) {
    if (unit > 0 && (hasHigherBlock || hundred > 0)) {
      result += `lẻ ${CHU_SO[unit]}`
    } else if (unit > 0) {
      result += CHU_SO[unit]
    }
  } else if (ten === 1) {
    result += "mười "
    if (unit === 5) {
      result += "lăm"
    } else if (unit > 0) {
      result += CHU_SO[unit]
    }
  } else {
    result += `${CHU_SO[ten]} mươi `
    if (unit === 1) {
      result += "mốt"
    } else if (unit === 4) {
      result += "tư"
    } else if (unit === 5) {
      result += "lăm"
    } else if (unit > 0) {
      result += CHU_SO[unit]
    }
  }

  return result.trim()
}

export function numberToVietnameseWords(num: number | string): string {
  let n = typeof num === 'string' ? parseInt(num, 10) : num

  if (isNaN(n)) return ""
  if (n === 0) return "không"

  const isNegative = n < 0
  n = Math.abs(n)

  const blocks: number[] = []
  while (n > 0) {
    blocks.push(n % 1000)
    n = Math.floor(n / 1000)
  }

  let words = ""
  for (const [i, block] of blocks.entries()) {
    if (block === 0 && i !== 0 && blocks.length > i) {
      // Skip empty blocks unless it's the billion multiplier jump
      if (i % 3 === 0 && i > 0) {
        words = `${DON_VI[3]} ${words}`
      }
      continue
    }

    const hasHigherBlock = i < blocks.length - 1
    const blockText = readThreeDigits(block, hasHigherBlock && block > 0)

    if (blockText) {
      const unit = DON_VI[i % 3]
      const billionMultiplier = Math.floor(i / 3) > 0 && (i % 3 === 0) ? DON_VI[3] + " " : ""

      words = `${blockText} ${unit} ${billionMultiplier}${words}`.trim() + " "
    }
  }

  words = (isNegative ? "âm " : "") + words.replace(/\s+/g, " ").trim()

  // Capitalize first letter
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function splitNumbersAndLetters(input: string) {
  const numbers = input.match(/\d+/g)?.join('') || ''
  const letters = input.match(/[a-zA-Z]+/g)?.join('') || ''

  return { numbers, letters }
}

export function calculateKhoiLuong(quyCach: string, tiTrong?: number | null): number | null {
  if (!quyCach) return 0
  const trimmed = quyCach.trim().toLowerCase()

  const match = trimmed.match(/^([\d.,]+)\s*(kg|lít|lit|l|gr|g|ml)$/i)
  let soLuong = 0
  let donVi = ""
  if (match) {
    soLuong = Number(match[1].replace(',', '.'))
    donVi = match[2].toLowerCase()
  } else {
    const data = trimmed.split(/\s+/)
    donVi = data[data.length - 1]
    soLuong = Number(data[data.length - 2])
  }

  if (isNaN(soLuong) || soLuong <= 0) return 0

  if (donVi === 'kg') {
    return soLuong
  } else if (donVi === 'lít' || donVi === 'lit' || donVi === 'l') {
    if (tiTrong == null || isNaN(tiTrong) || tiTrong <= 0) {
      return null
    }
    return soLuong * tiTrong
  } else if (donVi === 'gr' || donVi === 'g') {
    return soLuong / 1000
  } else if (donVi === 'ml') {
    if (tiTrong == null || isNaN(tiTrong) || tiTrong <= 0) {
      return null
    }
    return (soLuong * tiTrong) / 1000
  }
  return 0
}
