import ExcelJS from "exceljs"
import path from "node:path"

export default class Excel {
  private workbook: ExcelJS.Workbook
  private worksheet: ExcelJS.Worksheet
  private filepath: string

  private constructor(workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet, filepath: string) {
    this.workbook = workbook
    this.worksheet = worksheet
    this.filepath = filepath
  }

  static async loadTemplate(filename: string): Promise<Excel | { error: string }> {
    const templatePath = path.join(process.cwd(), 'public', filename)
    const workbook = new ExcelJS.Workbook()

    try {
      await workbook.xlsx.readFile(templatePath)

      const worksheet = workbook.getWorksheet(1)
      if (!worksheet) {
        return { error: `Không thể đọc file ${filename}` }
      }

      return new Excel(workbook, worksheet, templatePath)
    } catch {
      return { error: `File ${filename} không tồn tại hoặc lỗi đọc file` }
    }
  }

  writeCell(cellAddress: string, value: ExcelJS.CellValue): this {
    this.worksheet.getCell(cellAddress).value = value
    return this
  }

  addRow(data: (string | number)[]): this {
    this.worksheet.addRow(data)
    return this
  }

  applyFont (cellAddress: string, fontSize: number = 9, fontStyle: string = 'Times New Roman'): this {
    this.worksheet.getCell(cellAddress).font = {
      name: fontStyle,
      size: fontSize
    }
    return this
  }

  writeAndApplyFont(cellAddress: string, value: ExcelJS.CellValue, fontSize: number = 9, fontStyle: string = 'Times New Roman'): this {
    this.writeCell(cellAddress, value)
    this.applyFont(cellAddress, fontSize, fontStyle)
    return this
  }

  applyBorder (cellAddress: string): this {
    this.worksheet.getCell(cellAddress).border = {
      top: { style: `medium` },
      left: { style: `medium` },
      bottom: { style: `medium` },
      right: { style: `medium` },
    }
    return this
  }

  deleteBorder(cellAddress: string): this {
    const cell = this.worksheet.getCell(cellAddress)
    cell.style = {
      ...cell.style,
      border: undefined,
    }
    return this
  }

  mergeCells(startCell: string, endCell: string): this {
    this.worksheet.mergeCells(`${startCell}:${endCell}`)
    return this
  }

  center(cellAddress: string): this {
    this.align(cellAddress, 'middle', 'center')
    return this
  }

  alignVertical(cellAddress: string, vertical: 'top' | 'middle' | 'bottom'): this {
    this.worksheet.getCell(cellAddress).alignment = { vertical }
    return this
  }

  alignHorizontal(cellAddress: string, horizontal: 'left' | 'center' | 'right'): this {
    this.worksheet.getCell(cellAddress).alignment = { horizontal }
    return this
  }

  align(cellAddress: string, vertical: 'top' | 'middle' | 'bottom', horizontal: 'left' | 'center' | 'right'): this {
    this.worksheet.getCell(cellAddress).alignment = { vertical, horizontal }
    return this
  }

  formatCurrency(cellAddress: string): this {
    this.worksheet.getCell(cellAddress).numFmt = '#,##0' //#,##0 [$₫-42A];[Red]#,##0 [$₫-42A]
    return this
  }

  test(): this {
    console.log(this.worksheet.getCell(`F4`).value)
    return this
  }

  createOutput() {
    return this.workbook.xlsx.writeBuffer()
  }
}
