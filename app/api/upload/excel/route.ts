import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string // 'siswa' | 'nilai-ujian' | 'nilai-hafalan'

    if (!file) {
      return NextResponse.json({ success: false, error: "File tidak ditemukan" }, { status: 400 })
    }

    if (!type) {
      return NextResponse.json({ success: false, error: "Tipe template wajib diisi" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls)" },
        { status: 400 },
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: "Ukuran file maksimal 10MB" }, { status: 400 })
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads", "excel")
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `${type}_${timestamp}.${fileExtension}`
    const filePath = join(uploadDir, fileName)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      data: {
        filename: fileName,
        path: `/uploads/excel/${fileName}`,
        size: file.size,
        type,
      },
      message: "File Excel berhasil diupload",
    })
  } catch (error) {
    console.error("Error uploading Excel file:", error)
    return NextResponse.json({ success: false, error: "Gagal mengupload file Excel" }, { status: 500 })
  }
}
