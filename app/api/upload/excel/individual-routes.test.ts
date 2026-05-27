import ExcelJS from "exceljs"
import { NextRequest } from "next/server"
import { mockPrisma } from "../../../../jest.setup"
import { POST as postNilaiUjian } from "./nilai-ujian/route"
import { POST as postNilaiHafalan } from "./nilai-hafalan/route"
import { POST as postKehadiran } from "./kehadiran/route"
import { POST as postPenilaianSikap } from "./penilaian-sikap/route"
import { POST as postCatatanSiswa } from "./catatan-siswa/route"

const mockExcelJS = ExcelJS as jest.Mocked<typeof ExcelJS>

function createRequest() {
  const formData = new FormData()
  formData.append("file", new File(["dummy"], "template.xlsx"))
  formData.append("kelas_id", "1")
  formData.append("periode_ajaran_id", "2")
  const request = new NextRequest("http://localhost/api/upload", { method: "POST", body: formData })
  jest.spyOn(request, "formData").mockResolvedValue(formData)
  return request
}

function setWorkbook(worksheet: any) {
  ;(mockExcelJS.Workbook as jest.Mock).mockImplementation(() => ({
    xlsx: { load: jest.fn().mockResolvedValue(undefined) },
    worksheets: [worksheet],
  }))
}

function cellRow(values: Record<number, unknown>) {
  return { getCell: (index: number) => ({ value: values[index] }) }
}

describe("upload individual membuat import batch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.importTemplateJob.create.mockResolvedValue({
      id: "job-1",
      status: "PENDING",
      total_siswa: 1,
      total_batches: 1,
      batches: [],
    } as any)
  })

  test("nilai ujian menjadwalkan payload tanpa upsert langsung", async () => {
    setWorkbook({ getSheetValues: () => [[], [], [null, "001", "Ahmad", "Nahwu", 9]] })
    const body = await (await postNilaiUjian(createRequest())).json()
    expect(body.job.id).toBe("job-1")
    expect(mockPrisma.importTemplateJob.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ kelas_id: 1, periode_ajaran_id: 2 }),
    }))
    expect(mockPrisma.nilaiUjian.upsert).not.toHaveBeenCalled()
  })

  test("kehadiran menjadwalkan payload tanpa upsert langsung", async () => {
    setWorkbook({ getSheetValues: () => [[], [], [null, "001", "Ahmad", "Harian", 1, 0, 0]] })
    const body = await (await postKehadiran(createRequest())).json()
    expect(body.job.id).toBe("job-1")
    expect(mockPrisma.kehadiran.upsert).not.toHaveBeenCalled()
  })

  test("nilai hafalan menjadwalkan payload tanpa upsert langsung", async () => {
    setWorkbook({
      name: "Template Nilai Hafalan",
      rowCount: 2,
      getRow: () => cellRow({ 1: "001", 2: "Ahmad", 3: "Hafalan", 5: "Juz Amma", 6: "Tercapai" }),
    })
    const body = await (await postNilaiHafalan(createRequest())).json()
    expect(body.job.id).toBe("job-1")
    expect(mockPrisma.nilaiHafalan.upsert).not.toHaveBeenCalled()
  })

  test("penilaian sikap menjadwalkan payload dengan rentang 0-100", async () => {
    const header = { A1: "NIS", B1: "Nama Siswa", C1: "Indikator Sikap", D1: "Nilai", E1: "Semester", F1: "Periode Ajaran" }
    setWorkbook({
      getCell: (address: keyof typeof header) => ({ value: header[address] }),
      eachRow: (callback: (row: any, rowNumber: number) => void) => {
        callback(cellRow({ 1: "NIS", 2: "Nama Siswa", 3: "Indikator Sikap", 4: "Nilai" }), 1)
        callback(cellRow({ 1: "001", 2: "Ahmad", 3: "Disiplin", 4: 95 }), 2)
      },
    })
    const body = await (await postPenilaianSikap(createRequest())).json()
    expect(body.job.id).toBe("job-1")
    expect(mockPrisma.penilaianSikap.upsert).not.toHaveBeenCalled()
  })

  test("catatan siswa menjadwalkan payload tanpa upsert langsung", async () => {
    const header = { A1: "NIS", B1: "Nama Siswa", C1: "Catatan Sikap", D1: "Catatan Akademik" }
    setWorkbook({
      getCell: (address: keyof typeof header) => ({ value: header[address] }),
      eachRow: (callback: (row: any, rowNumber: number) => void) => {
        callback(cellRow({ 1: "NIS", 2: "Nama Siswa", 3: "Catatan Sikap", 4: "Catatan Akademik" }), 1)
        callback(cellRow({ 1: "001", 2: "Ahmad", 3: "Baik", 4: "Tekun" }), 2)
      },
    })
    const body = await (await postCatatanSiswa(createRequest())).json()
    expect(body.job.id).toBe("job-1")
    expect(mockPrisma.catatanSiswa.upsert).not.toHaveBeenCalled()
  })
})
