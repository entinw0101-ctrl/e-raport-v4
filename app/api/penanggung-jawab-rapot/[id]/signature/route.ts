import { type NextRequest, NextResponse } from "next/server"
import { put, del } from "@vercel/blob"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID tidak valid" },
        { status: 400 }
      )
    }

    // Check if penanggung jawab rapot exists
    const penanggungJawabRapot = await prisma.penanggungJawabRapot.findUnique({
      where: { id },
    })

    if (!penanggungJawabRapot) {
      return NextResponse.json(
        { success: false, error: "Penanggung jawab rapot tidak ditemukan" },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const signatureFile = formData.get("signature") as File

    if (!signatureFile) {
      return NextResponse.json(
        { success: false, error: "File tanda tangan tidak ditemukan" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(signatureFile.type)) {
      return NextResponse.json(
        { success: false, error: "Format file harus JPEG, JPG, atau PNG" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `signature_penanggung_jawab_${id}_${timestamp}.png`

    let filePath: string

    // Check if we're in production (Vercel) or development
    if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
      // Use Vercel Blob Storage in production
      const blob = await put(fileName, signatureFile, {
        access: 'public',
        contentType: signatureFile.type,
      })
      filePath = blob.url
    } else {
      // Use local file storage in development
      const uploadDir = join(process.cwd(), "public", "uploads", "signatures")
      try {
        await mkdir(uploadDir, { recursive: true })
      } catch (error) {
        // Directory might already exist
      }

      const localFilePath = join(uploadDir, fileName)
      const bytes = await signatureFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(localFilePath, buffer)

      filePath = `/uploads/signatures/${fileName}`
    }

    // Update penanggung jawab rapot with signature path
    await prisma.penanggungJawabRapot.update({
      where: { id },
      data: {
        tanda_tangan: filePath,
      },
    })

    return NextResponse.json({
      success: true,
      data: { tanda_tangan: filePath },
      message: "Tanda tangan berhasil diupload",
    })
  } catch (error) {
    console.error("Error uploading signature:", error)
    return NextResponse.json(
      { success: false, error: "Gagal upload tanda tangan" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID tidak valid" },
        { status: 400 }
      )
    }

    // Check if penanggung jawab rapot exists
    const penanggungJawabRapot = await prisma.penanggungJawabRapot.findUnique({
      where: { id },
    })

    if (!penanggungJawabRapot) {
      return NextResponse.json(
        { success: false, error: "Penanggung jawab rapot tidak ditemukan" },
        { status: 404 }
      )
    }

    // Delete signature file if it exists
    if (penanggungJawabRapot.tanda_tangan) {
      if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
        // Delete from Vercel Blob Storage
        try {
          await del(penanggungJawabRapot.tanda_tangan)
        } catch (error) {
          console.error("Error deleting from blob storage:", error)
        }
      } else {
        // Delete from local storage
        try {
          const filePath = join(process.cwd(), "public", penanggungJawabRapot.tanda_tangan.replace(/^\//, ""))
          await unlink(filePath)
        } catch (error) {
          console.error("Error deleting local file:", error)
        }
      }
    }

    // Update penanggung jawab rapot to remove signature path
    await prisma.penanggungJawabRapot.update({
      where: { id },
      data: {
        tanda_tangan: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Tanda tangan berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting signature:", error)
    return NextResponse.json(
      { success: false, error: "Gagal menghapus tanda tangan" },
      { status: 500 }
    )
  }
}