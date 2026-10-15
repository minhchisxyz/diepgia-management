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

  writeCell(cellAddress: string, value: string | number): this {
    this.worksheet.getCell(cellAddress).value = value
    return this
  }

  addRow(data: (string | number)[]): this {
    this.worksheet.addRow(data)
    return this
  }

  applyFont (cellAddress: string, fontStyle: string = 'Times New Roman', fontSize: number = 9): this {
    this.worksheet.getCell(cellAddress).font = {
      name: fontStyle,
      size: fontSize
    }
    return this
  }

  writeAndApplyFont(cellAddress: string, value: string | number, fontStyle: string = 'Times New Roman', fontSize: number = 9): this {
    this.writeCell(cellAddress, value)
    this.applyFont(cellAddress, fontStyle, fontSize)
    return this
  }

  applyBorder (cellAddress: string): this {
    this.worksheet.getCell(cellAddress).border = {
      top: { style: `thin` },
      left: { style: `thin` },
      bottom: { style: `thin` },
      right: { style: `thin` },
    }
    return this
  }

  mergeCells(startCell: string, endCell: string): this {
    this.worksheet.mergeCells(`${startCell}:${endCell}`)
    return this
  }

  createOutput() {
    return this.workbook.xlsx.writeBuffer()
  }
}
