import { generatedKehadiran, generatedNilaiSikap, generatedNilaiUjian } from "./import-template-simulation"

describe("generated simulation values", () => {
  test("menghasilkan nilai dalam rentang bisnis yang berlaku", () => {
    for (let studentId = 1; studentId <= 200; studentId++) {
      const nilaiUjian = generatedNilaiUjian(studentId, 31)
      const nilaiSikap = generatedNilaiSikap(studentId, 41)
      const kehadiran = generatedKehadiran(studentId)

      expect(nilaiUjian).toBeGreaterThanOrEqual(0)
      expect(nilaiUjian).toBeLessThanOrEqual(10)
      expect(nilaiSikap).toBeGreaterThanOrEqual(0)
      expect(nilaiSikap).toBeLessThanOrEqual(100)
      expect(kehadiran.sakit).toBeGreaterThanOrEqual(0)
      expect(kehadiran.izin).toBeGreaterThanOrEqual(0)
      expect(kehadiran.alpha).toBeGreaterThanOrEqual(0)
    }
  })
})
