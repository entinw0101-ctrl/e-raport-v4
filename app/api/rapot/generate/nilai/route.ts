import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import ImageModule from "docxtemplater-image-module-free"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { generateLaporanNilai } from "@/lib/raport-utils"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const { siswaId, periodeAjaranId, format: outputFormat = 'docx' } = await request.json()

    if (!siswaId || !periodeAjaranId) {
      return NextResponse.json(
        { success: false, error: "siswaId dan periodeAjaranId wajib diisi" },
        { status: 400 }
      )
    }

    // First validate and get report data (admin mode for flexible validation)
    const result = await generateLaporanNilai(siswaId, periodeAjaranId, { isAdmin: true })

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

    // Pre-load wali kelas signature image
    let waliKelasSignatureBuffer: Buffer = Buffer.alloc(0)
    const signature = siswa.kelas?.wali_kelas?.tanda_tangan
    if (signature) {
      if (signature.startsWith('https://')) {
        // Fetch from Vercel Blob Storage
        try {
          const response = await fetch(signature)
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            waliKelasSignatureBuffer = Buffer.from(arrayBuffer)
          }
        } catch (error) {
          console.error('Error fetching signature from blob:', error)
        }
      } else {
        // Read from local filesystem
        try {
          const localPath = path.join(process.cwd(), 'public', signature.replace(/^\//, ''))
          waliKelasSignatureBuffer = fs.readFileSync(localPath)
        } catch (error) {
          console.error('Error reading local signature:', error)
        }
      }
    }

    // Fetch active nilai template
    const template = await prisma.templateDokumen.findFirst({
      where: {
        jenis_template: "NILAI",
        is_active: true,
      },
    })

    if (!template) {
      console.log("No active template found")
      return NextResponse.json(
        { success: false, error: "Template nilai tidak ditemukan. Silakan upload template terlebih dahulu." },
        { status: 404 }
      )
    }

    // Setup image module for wali kelas signature
    const imageOpts = {
      getImage: (tagValue: string) => {
        console.log('getImage called with tagValue:', tagValue)
        if (tagValue === 'wali_kelas_signature') {
          console.log('Returning pre-loaded signature buffer, size:', waliKelasSignatureBuffer.length)
          return waliKelasSignatureBuffer
        }
        // For any other images
        return Buffer.alloc(0)
      },
      getSize: () => [150, 75], // width, height in pixels
    }

    // Load template file (detect based on file_path format)
    let templateContent: string

    if (template.file_path.startsWith('https://')) {
      // If it's a full URL (Vercel Blob), fetch from cloud storage
      const response = await fetch(template.file_path)
      if (!response.ok) {
        throw new Error("Failed to fetch template from storage")
      }
      const arrayBuffer = await response.arrayBuffer()
      templateContent = arrayBuffer as any
    } else {
      // If it's a local path, read from file system
      const templatePath = path.join(process.cwd(), 'public', template.file_path.replace(/^\//, ""))
      templateContent = fs.readFileSync(templatePath, 'binary')
    }

    // Load template with image module
    const zip = new PizZip(templateContent)
    // @ts-ignore - Image module doesn't have proper types
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [new ImageModule(imageOpts)],
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
        alpha: item.alpha,
        total: item.sakit + item.izin + item.alpha
      })),

      // Wali kelas info
      nama_wali_kelas: siswa.kelas?.wali_kelas?.nama || "",
      nip_wali_kelas: siswa.kelas?.wali_kelas?.nip || "",
      // Image placeholder
      tanda_tangan_wali_kelas: 'wali_kelas_signature',

      // Metadata
      tgl_raport: `Sumedang, ${formatTanggal(new Date())}`,
    }

    // Set template data (following sikap rapor pattern)
    doc.render(data)

    // Generate output buffer
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