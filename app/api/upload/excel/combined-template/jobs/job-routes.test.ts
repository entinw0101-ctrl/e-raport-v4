import { mockPrisma } from "../../../../../../jest.setup"
import { processImportTemplateBatch } from "@/lib/import-template-processor"
import { synchronizeImportTemplateJob } from "@/lib/import-template-progress"
import { POST as processJob } from "./[job_id]/process/route"
import { POST as retryJob } from "./[job_id]/retry/route"

jest.mock("@/lib/import-template-processor", () => ({
  processImportTemplateBatch: jest.fn(),
}))
jest.mock("@/lib/import-template-progress", () => ({
  synchronizeImportTemplateJob: jest.fn(),
}))

const mockProcessImportTemplateBatch = processImportTemplateBatch as jest.MockedFunction<typeof processImportTemplateBatch>
const mockSynchronizeImportTemplateJob = synchronizeImportTemplateJob as jest.MockedFunction<typeof synchronizeImportTemplateJob>

describe("import job processing routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.importTemplateJob.findUnique.mockResolvedValue({
      id: "job-1",
      status: "PENDING",
      kelas_id: 1,
      periode_ajaran_id: 2,
    } as any)
    mockSynchronizeImportTemplateJob.mockResolvedValue({ id: "job-1", status: "PROCESSING" } as any)
  })

  test("process mengklaim dan menyelesaikan batch pending", async () => {
    mockPrisma.importTemplateBatch.findFirst.mockResolvedValue({
      id: "batch-1",
      job_id: "job-1",
      status: "PENDING",
      percobaan: 0,
      payload: { nilaiUjian: [], nilaiHafalan: [], kehadiran: [], penilaianSikap: [], catatanSiswa: [] },
    } as any)
    mockPrisma.importTemplateBatch.updateMany.mockResolvedValue({ count: 1 } as any)
    mockProcessImportTemplateBatch.mockResolvedValue({
      nilaiUjian: { inserted: 0, updated: 0, errors: 0 },
      nilaiHafalan: { inserted: 0, updated: 0, errors: 0 },
      kehadiran: { inserted: 0, updated: 0, errors: 0 },
      penilaianSikap: { inserted: 0, updated: 0, errors: 0 },
      catatanSiswa: { inserted: 0, updated: 0, errors: 0 },
    })

    const response = await processJob(new Request("http://localhost/process", { method: "POST" }), { params: Promise.resolve({ job_id: "job-1" }) })

    expect(response.status).toBe(200)
    expect(mockProcessImportTemplateBatch).toHaveBeenCalledWith(expect.anything(), 1, 2)
    expect(mockPrisma.importTemplateBatch.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "COMPLETED" }),
    }))
  })

  test("retry mengembalikan batch failed ke pending", async () => {
    mockSynchronizeImportTemplateJob.mockResolvedValue({ id: "job-1", status: "PROCESSING" } as any)

    const response = await retryJob(new Request("http://localhost/retry", { method: "POST" }), { params: Promise.resolve({ job_id: "job-1" }) })

    expect(response.status).toBe(200)
    expect(mockPrisma.importTemplateBatch.updateMany).toHaveBeenCalledWith({
      where: { job_id: "job-1", status: "FAILED" },
      data: { status: "PENDING", percobaan: 0, pesan_error: null },
    })
    expect(mockPrisma.importTemplateJob.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "PROCESSING" }),
    }))
  })
})
