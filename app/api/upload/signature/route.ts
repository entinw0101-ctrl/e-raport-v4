import { type NextRequest, NextResponse } from "next/server"
import { put, del } from "@vercel/blob"
import { writeFile, mkdir, unlink } from "fs/promises"
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

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `signature_${guru_id}_${timestamp}.${fileExtension}`

    let signaturePath: string

    // Check if we're in production (Vercel) or development
    if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
      // Use Vercel Blob Storage in production
      const blob = await put(fileName, file, {
        access: 'public',
        contentType: file.type,
      })
      signaturePath = blob.url
    } else {
      // Use local file storage in development
      const uploadDir = join(process.cwd(), "public", "uploads", "signatures")
      try {
        await mkdir(uploadDir, { recursive: true })
      } catch (error) {
        // Directory might already exist
      }

      const filePath = join(uploadDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      signaturePath = `/uploads/signatures/${fileName}`
    }

    // Update guru record with signature path
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guru_id = searchParams.get("guru_id")

    if (!guru_id) {
      return NextResponse.json({ success: false, error: "ID Guru wajib diisi" }, { status: 400 })
    }

    // Check if guru exists and has a signature
    const guru = await prisma.guru.findUnique({
      where: { id: Number.parseInt(guru_id) },
      select: { id: true, tanda_tangan: true }
    })

    if (!guru) {
      return NextResponse.json({ success: false, error: "Guru tidak ditemukan" }, { status: 404 })
    }

    if (!guru.tanda_tangan) {
      // If guru doesn't have a signature, consider it already "deleted" (idempotent operation)
      return NextResponse.json({
        success: true,
        message: "Tanda tangan sudah tidak ada",
      })
    }

    // Delete signature based on environment
    if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
      // Delete from Vercel Blob Storage
      try {
        await del(guru.tanda_tangan)
      } catch (error) {
        console.error("Error deleting from Vercel Blob:", error)
        // Continue with database update even if file deletion fails
      }
    } else {
      // Delete from local storage
      try {
        const fileName = guru.tanda_tangan.split('/').pop()
        if (fileName) {
          const filePath = join(process.cwd(), "public", "uploads", "signatures", fileName)
          await unlink(filePath)
        }
      } catch (error) {
        console.error("Error deleting local file:", error)
        // Continue with database update even if file deletion fails
      }
    }

    // Update guru record to remove signature path
    await prisma.guru.update({
      where: { id: Number.parseInt(guru_id) },
      data: { tanda_tangan: null },
    })

    return NextResponse.json({
      success: true,
      message: "Tanda tangan berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting signature:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus tanda tangan" }, { status: 500 })
  }
}
