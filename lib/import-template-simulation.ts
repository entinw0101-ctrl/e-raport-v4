export function isImportSimulationEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_IMPORT_SIMULATION === "true"
}

export function generatedNilaiUjian(studentId: number, itemId: number) {
  return Number((6 + ((studentId + itemId) % 41) / 10).toFixed(1))
}

export function generatedNilaiSikap(studentId: number, itemId: number) {
  return 75 + ((studentId + itemId) % 26)
}

export function generatedKehadiran(studentId: number) {
  return {
    sakit: studentId % 3,
    izin: (studentId + 1) % 2,
    alpha: studentId % 2 === 0 ? 0 : 1,
  }
}
