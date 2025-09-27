import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { generateLaporanNilai } from "@/lib/raport-utils"

export async function POST(request: NextRequest) {
  try {
    const { siswaId, periodeAjaranId, format: outputFormat = 'docx' } = await request.json()

    if (!siswaId || !periodeAjaranId) {
      return NextResponse.json(
        { success: false, error: "siswaId dan periodeAjaranId wajib diisi" },
        { status: 400 }
      )
    }

    // First validate and get report data
    const result = await generateLaporanNilai(siswaId, periodeAjaranId)

    if (!result.canGenerate) {
      return NextResponse.json(
        { success: false, error: result.error, warnings: result.warnings },
        { status: 400 }
      )
    }

    const reportData = result.data!

    // Fetch student data for additional info (kelas, etc.)
    const siswa = await prisma.siswa.findUnique({
      where: { id: parseInt(siswaId) },
      include: {
        kelas: {
          include: {
            wali_kelas: true,
            tingkatan: true,
          },
        },
      },
    })

    if (!siswa) {
      return NextResponse.json(
        { success: false, error: "Siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    // Fetch active nilai template
    const template = await prisma.templateDokumen.findFirst({
      where: {
        jenis_template: "NILAI",
        is_active: true,
      },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template nilai tidak ditemukan. Silakan upload template terlebih dahulu." },
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

    // Helper function to format date
    const formatTanggal = (date: Date | string | null) => {
      if (!date) return '-'
      return format(new Date(date), "dd MMMM yyyy", { locale: id })
    }

    // Prepare data for template
    const data = {
      // Header info
      nama: reportData.header.nama,
      no_induk: reportData.header.nis,
      kota_asal: reportData.header.kotaAsal,
      kelas: siswa.kelas?.nama_kelas || 'N/A',

      // Specific placeholders for header format (following project pattern)
      semester_text: reportData.header.semester, // GANJIL or GENAP
      thn_ajaran: reportData.header.tahunAjaran, // 2024/2025
      thn_ajaran_hijriah: reportData.header.tahunAjaranHijriah, // 1445/1446 H.

      // Keep original format for backward compatibility
      semester: reportData.header.semester,
      tahun_ajaran: reportData.header.tahunAjaran,
      tahun_ajaran_hijriah: reportData.header.tahunAjaranHijriah,

      // Summary data
      total_nilai_ujian: reportData.totalNilaiUjian,
      rata_rata_ujian: reportData.rataRataUjian,
      rata_pred_akhir: reportData.rataRataPredikatUjian,
      peringkat: reportData.peringkat || '-',
      total_siswa: reportData.totalSiswa || '-',
      status_hafalan: reportData.statusHafalan,
      total_sakit: reportData.totalSakit || 0,
      total_izin: reportData.totalIzin || 0,
      total_alpha: reportData.totalAlpha || 0,
      total_kehadiran: reportData.totalKehadiran || 0,
      persentase_kehadiran: reportData.persentaseKehadiran || '0.00%',
      total: reportData.total || 0,
      catatan_akademik: reportData.catatanAkademik,

      // Detailed nilai ujian (for loops in template)
      nilai_ujian: reportData.nilaiUjian.map((item: any, index: number) => ({
        no: index + 1, // 1-based numbering
        mata_pelajaran: item.mataPelajaran,
        kitab: item.kitab,
        nilai: item.nilai,
        predikat: item.predikat
      })),

      // Detailed nilai hafalan (for loops in template)
      nilai_hafalan: reportData.nilaiHafalan.map((item: any, index: number) => ({
        no: index + 1, // 1-based numbering
        mata_pelajaran: item.mataPelajaran,
        kitab: item.kitab,
        target_hafalan: item.targetHafalan,
        predikat: item.predikat
      })),

      // Detailed kehadiran (for loops in template)
      kehadiran: reportData.kehadiran.map((item: any, index: number) => ({
        no: index + 1, // 1-based numbering
        indikator_kehadiran: item.indikatorKehadiran,
        sakit: item.sakit,
        izin: item.izin,
        alpha: item.alpha
      })),

      // Metadata
      tgl_raport: formatTanggal(new Date()),
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
    headers.set('Content-Disposition', `attachment; filename="Nilai_${reportData.header.nama?.replace(/\s+/g, '_') || 'Siswa'}_${reportData.header.tahunAjaran}.docx"`)

    return new NextResponse(outputBuffer as any, {
      status: 200,
      headers,
    })

  } catch (error) {
    console.error("Error generating nilai report:", error)
    return NextResponse.json(
      { success: false, error: "Gagal generate laporan nilai" },
      { status: 500 }
    )
  }
}