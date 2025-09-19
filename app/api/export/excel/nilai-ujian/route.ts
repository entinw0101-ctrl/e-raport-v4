import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Generate Excel template for nilai ujian
    const headers = ["NIS Siswa", "Nama Siswa", "Mata Pelajaran", "Nilai (0-100)", "Predikat (A/B/C/D/E)"]

    // Sample data
    const sampleData = [
      ["2024001", "Ahmad Fauzi", "Matematika", "85", "B"],
      ["2024001", "Ahmad Fauzi", "Bahasa Indonesia", "90", "A"],
    ]

    // Create CSV content
    const csvContent = [headers, ...sampleData].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=template_nilai_ujian.csv",
      },
    })
  } catch (error) {
    console.error("Error generating nilai ujian template:", error)
    return NextResponse.json({ success: false, error: "Gagal membuat template nilai ujian" }, { status: 500 })
  }
}
