import type ExcelJS from "exceljs"

const IMPORT_CONTEXT_SHEET = "__IMPORT_CONTEXT__"
const IMPORT_CONTEXT_MARKER = "E_RAPOT_IMPORT_CONTEXT_V1"

export interface ImportTemplateContext {
  kelasId: string
  periodeAjaranId: string
  isSimulation: boolean
}

function cellText(value: ExcelJS.CellValue) {
  return String(value ?? "").trim()
}

export function addImportTemplateContext(workbook: ExcelJS.Workbook, context: ImportTemplateContext) {
  const sheet = workbook.addWorksheet(IMPORT_CONTEXT_SHEET)
  sheet.getCell("A1").value = IMPORT_CONTEXT_MARKER
  sheet.getCell("A2").value = "kelas_id"
  sheet.getCell("B2").value = context.kelasId
  sheet.getCell("A3").value = "periode_ajaran_id"
  sheet.getCell("B3").value = context.periodeAjaranId
  sheet.getCell("A4").value = "is_simulasi"
  sheet.getCell("B4").value = context.isSimulation
  sheet.state = "veryHidden"
}

export function readImportTemplateContext(workbook: ExcelJS.Workbook): ImportTemplateContext | null {
  const sheet = workbook.getWorksheet(IMPORT_CONTEXT_SHEET)
  if (!sheet || cellText(sheet.getCell("A1").value) !== IMPORT_CONTEXT_MARKER) return null

  const kelasId = cellText(sheet.getCell("B2").value)
  const periodeAjaranId = cellText(sheet.getCell("B3").value)
  const isSimulation = sheet.getCell("B4").value === true || cellText(sheet.getCell("B4").value).toLowerCase() === "true"

  if (!kelasId || !periodeAjaranId) return null

  return { kelasId, periodeAjaranId, isSimulation }
}
