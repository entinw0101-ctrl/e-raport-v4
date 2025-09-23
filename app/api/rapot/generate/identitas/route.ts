import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import { format } from "date-fns"
import { id } from "date-fns/locale"

export async function POST(request: NextRequest) {
  try {
    const { siswaId, periodeAjaranId, format = 'docx' } = await request.json()

    if (!siswaId || !periodeAjaranId) {
      return NextResponse.json(
        { success: false, error: "siswaId dan periodeAjaranId wajib diisi" },
        { status: 400 }
      )
    }

    // Fetch active identitas template
    const template = await prisma.templateDokumen.findFirst({
      where: {
        jenis_template: "IDENTITAS",
        is_active: true,
      },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template identitas tidak ditemukan. Silakan upload template terlebih dahulu." },
        { status: 404 }
      )
    }

    // Fetch student data
    const siswa = await prisma.siswa.findUnique({
      where: { id: parseInt(siswaId) },
      include: {
        kelas: {
          include: {
            wali_kelas: true,
            tingkatan: true,
          },
        },
        kamar: true,
      },
    })

    if (!siswa) {
      return NextResponse.json(
        { success: false, error: "Siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    // Fetch periode ajaran
    const periodeAjaran = await prisma.periodeAjaran.findUnique({
      where: { id: parseInt(periodeAjaranId) },
      select: {
        nama_ajaran: true,
        semester: true,
      },
    })

    if (!periodeAjaran) {
      return NextResponse.json(
        { success: false, error: "Periode ajaran tidak ditemukan" },
        { status: 404 }
      )
    }

    // Fetch template file
    let templateBuffer: ArrayBuffer

    if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
      // Fetch from Vercel Blob Storage
      const response = await fetch(template.file_path)
      if (!response.ok) {
        throw new Error("Failed to fetch template from storage")
      }
      templateBuffer = await response.arrayBuffer()
    } else {
      // Fetch from local storage
      const fs = await import("fs/promises")
      const path = await import("path")
      const filePath = path.join(process.cwd(), "public", template.file_path.replace(/^\//, ""))
      templateBuffer = await fs.readFile(filePath) as any
    }

    // Load template
    const zip = new PizZip(templateBuffer)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })

    // Prepare data for template
    const data = {
      nama_siswa: siswa.nama || "",
      nis: siswa.nis,
      tempat_lahir: siswa.tempat_lahir || "",
      tanggal_lahir: siswa.tanggal_lahir
        ? format(new Date(siswa.tanggal_lahir), "dd MMMM yyyy", { locale: id })
        : "",
      ttl: siswa.tempat_lahir && siswa.tanggal_lahir
        ? `${siswa.tempat_lahir}, ${format(new Date(siswa.tanggal_lahir), "dd MMMM yyyy", { locale: id })}`
        : "",
      jenis_kelamin: siswa.jenis_kelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
      agama: siswa.agama || "",
      alamat: siswa.alamat || "",
      kelas: siswa.kelas?.nama_kelas || "",
      tingkatan: siswa.kelas?.tingkatan?.nama_tingkatan || "",
      kelas_lengkap: siswa.kelas
        ? `${siswa.kelas.nama_kelas}${siswa.kelas.tingkatan ? ` (${siswa.kelas.tingkatan.nama_tingkatan})` : ''}`
        : "",
      wali_kelas: siswa.kelas?.wali_kelas?.nama || "",
      nip_wali_kelas: siswa.kelas?.wali_kelas?.nip || "",
      kamar: siswa.kamar?.nama_kamar || "",
      periode_ajaran: periodeAjaran.nama_ajaran,
      semester: periodeAjaran.semester === 'SATU' ? '1' : '2',
      tahun_ajaran: periodeAjaran.nama_ajaran,
    }

    // Set data in template
    doc.setData(data)

    try {
      // Render the document
      doc.render()
    } catch (error) {
      console.error("Template rendering error:", error)
      return NextResponse.json(
        { success: false, error: "Gagal memproses template. Periksa placeholder di template." },
        { status: 500 }
      )
    }

    // Generate output
    const outputBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    })

    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    headers.set('Content-Disposition', `attachment; filename="Identitas_${siswa.nama?.replace(/\s+/g, '_') || 'Siswa'}_${periodeAjaran.nama_ajaran}.docx"`)

    return new NextResponse(outputBuffer as any, {
      status: 200,
      headers,
    })

  } catch (error) {
    console.error("Error generating identitas report:", error)
    return NextResponse.json(
      { success: false, error: "Gagal generate laporan identitas" },
      { status: 500 }
    )
  }
}