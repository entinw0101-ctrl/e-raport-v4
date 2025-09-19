import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const guru_id = formData.get("guru_id") as string

    if (!file) {
      return NextResponse.json({ success: false, error: "File tidak ditemukan" }, { status: 400 })
    }

    if (!guru_id) {
      return NextResponse.json({ success: false, error: "ID Guru wajib diisi" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Format file tidak didukung. Gunakan JPG, JPEG, atau PNG" },
        { status: 400 },
      )
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: "Ukuran file maksimal 2MB" }, { status: 400 })
    }

    // Check if guru exists
    const guru = await prisma.guru.findUnique({
      where: { id: Number.parseInt(guru_id) },
    })

    if (!guru) {
      return NextResponse.json({ success: false, error: "Guru tidak ditemukan" }, { status: 404 })
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads", "signatures")
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `signature_${guru_id}_${timestamp}.${fileExtension}`
    const filePath = join(uploadDir, fileName)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Update guru record with signature path
    const signaturePath = `/uploads/signatures/${fileName}`
    await prisma.guru.update({
      where: { id: Number.parseInt(guru_id) },
      data: { tanda_tangan: signaturePath },
    })

    return NextResponse.json({
      success: true,
      data: {
        filename: fileName,
        path: signaturePath,
        size: file.size,
      },
      message: "Tanda tangan berhasil diupload",
    })
  } catch (error) {
    console.error("Error uploading signature:", error)
    return NextResponse.json({ success: false, error: "Gagal mengupload tanda tangan" }, { status: 500 })
  }
}
