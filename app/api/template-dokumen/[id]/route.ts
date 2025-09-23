import { type NextRequest, NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { unlink } from "fs/promises"
import { join } from "path"
import { prisma } from "@/lib/prisma"

export async function PUT(
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

    const { nama_template, jenis_template, is_active } = await request.json()

    // Check if template exists
    const existingTemplate = await prisma.templateDokumen.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Template tidak ditemukan" },
        { status: 404 }
      )
    }

    // If activating a template, deactivate others of the same type
    if (is_active && jenis_template) {
      await prisma.templateDokumen.updateMany({
        where: {
          jenis_template: jenis_template as any,
          id: { not: id },
        },
        data: { is_active: false },
      })
    }

    // Update template
    const updatedTemplate = await prisma.templateDokumen.update({
      where: { id },
      data: {
        nama_template,
        jenis_template: jenis_template as any,
        is_active,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: "Template berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating template:", error)
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui template" },
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

    // Check if template exists
    const template = await prisma.templateDokumen.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template tidak ditemukan" },
        { status: 404 }
      )
    }

    // Delete file from storage
    if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
      // Delete from Vercel Blob Storage
      try {
        await del(template.file_path)
      } catch (error) {
        console.error("Error deleting from Vercel Blob:", error)
      }
    } else {
      // Delete from local storage
      try {
        const fileName = template.file_path.split('/').pop()
        if (fileName) {
          const filePath = join(process.cwd(), "public", "uploads", "templates", fileName)
          await unlink(filePath)
        }
      } catch (error) {
        console.error("Error deleting local file:", error)
      }
    }

    // Delete template record
    await prisma.templateDokumen.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Template berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json(
      { success: false, error: "Gagal menghapus template" },
      { status: 500 }
    )
  }
}