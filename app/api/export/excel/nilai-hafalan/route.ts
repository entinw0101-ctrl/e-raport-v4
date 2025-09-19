import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Generate Excel template for nilai hafalan
    const headers = ["NIS Siswa", "Nama Siswa", "Mata Pelajaran", "Target Hafalan", "Status (TERCAPAI/TIDAK_TERCAPAI)"]

    // Sample data
    const sampleData = [
      ["2024001", "Ahmad Fauzi", "Tahfidz Al-Quran", "Juz 30 (An-Nas sampai Al-Fatiha)", "TERCAPAI"],
      ["2024001", "Ahmad Fauzi", "Hadits", "40 Hadits Nawawi (1-20)", "TIDAK_TERCAPAI"],
    ]

    // Create CSV content
    const csvContent = [headers, ...sampleData].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=template_nilai_hafalan.csv",
      },
    })
  } catch (error) {
    console.error("Error generating nilai hafalan template:", error)
    return NextResponse.json({ success: false, error: "Gagal membuat template nilai hafalan" }, { status: 500 })
  }
}
