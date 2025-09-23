import { type NextRequest, NextResponse } from "next/server"
import { put, del } from "@vercel/blob"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const search = searchParams.get("search") || ""

    const skip = (page - 1) * per_page

    const where: any = {}
    if (search) {
      where.nama_template = {
        contains: search,
        mode: "insensitive"
      }
    }

    const total = await prisma.templateDokumen.count({ where })
    const templates = await prisma.templateDokumen.findMany({
      where,
      orderBy: { dibuat_pada: "desc" },
      skip,
      take: per_page,
    })

    return NextResponse.json({
      success: true,
      data: templates,
      pagination: {
        page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page),
      },
    })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data template" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const nama_template = formData.get("nama_template") as string
    const jenis_template = formData.get("jenis_template") as string
    const file = formData.get("file") as File

    if (!nama_template || !jenis_template || !file) {
      return NextResponse.json(
        { success: false, error: "Semua field wajib diisi" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Format file harus DOCX" },
        { status: 400 }
      )
    }

    // Check if template type already exists and is active
    const existingTemplate = await prisma.templateDokumen.findFirst({
      where: {
        jenis_template: jenis_template as any,
        is_active: true,
      },
    })

    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Template untuk jenis ini sudah ada dan aktif. Nonaktifkan template lama terlebih dahulu." },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `template_${jenis_template.toLowerCase()}_${timestamp}.docx`

    let filePath: string

    // Check if we're in production (Vercel) or development
    if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
      // Use Vercel Blob Storage in production
      const blob = await put(fileName, file, {
        access: 'public',
        contentType: file.type,
      })
      filePath = blob.url
    } else {
      // Use local file storage in development
      const uploadDir = join(process.cwd(), "public", "uploads", "templates")
      try {
        await mkdir(uploadDir, { recursive: true })
      } catch (error) {
        // Directory might already exist
      }

      const localFilePath = join(uploadDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(localFilePath, buffer)

      filePath = `/uploads/templates/${fileName}`
    }

    // Create template record
    const template = await prisma.templateDokumen.create({
      data: {
        nama_template,
        jenis_template: jenis_template as any,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        is_active: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: template,
      message: "Template berhasil diupload",
    })
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json(
      { success: false, error: "Gagal mengupload template" },
      { status: 500 }
    )
  }
}