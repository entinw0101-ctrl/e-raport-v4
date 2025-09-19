import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Generate Excel template for siswa data
    const headers = [
      "NIS",
      "Nama Lengkap",
      "Jenis Kelamin (LAKI_LAKI/PEREMPUAN)",
      "Tempat Lahir",
      "Tanggal Lahir (YYYY-MM-DD)",
      "Agama",
      "Alamat",
      "Kota Asal",
      "Nama Ayah",
      "Pekerjaan Ayah",
      "Alamat Ayah",
      "Nama Ibu",
      "Pekerjaan Ibu",
      "Alamat Ibu",
      "Nama Wali",
      "Pekerjaan Wali",
      "Alamat Wali",
      "Status (Aktif/Lulus/Keluar/Pindah)",
    ]

    // Sample data
    const sampleData = [
      [
        "2024001",
        "Ahmad Fauzi",
        "LAKI_LAKI",
        "Jakarta",
        "2010-01-15",
        "Islam",
        "Jl. Merdeka No. 123",
        "Jakarta",
        "Budi Santoso",
        "Wiraswasta",
        "Jl. Merdeka No. 123",
        "Siti Aminah",
        "Ibu Rumah Tangga",
        "Jl. Merdeka No. 123",
        "",
        "",
        "",
        "Aktif",
      ],
    ]

    // Create CSV content
    const csvContent = [headers, ...sampleData].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=template_siswa.csv",
      },
    })
  } catch (error) {
    console.error("Error generating siswa template:", error)
    return NextResponse.json({ success: false, error: "Gagal membuat template siswa" }, { status: 500 })
  }
}
