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
      console.log("No active template found")
      return NextResponse.json(
        { success: false, error: "Template nilai tidak ditemukan. Silakan upload template terlebih dahulu." },
        { status: 404 }
      )
    }

    // Setup image module for wali kelas signature (following sikap rapor pattern)
    const imageOpts = {
      getImage: (tagValue: string) => {
        try {
          // tagValue should be the path to the signature image (following sikap rapor pattern)
          const imagePath = path.join(process.cwd(), 'public', tagValue)
          return fs.readFileSync(imagePath)
        } catch (error) {
          console.error('Error loading signature image:', error)
          // Return empty buffer if image not found
          return Buffer.alloc(0)
        }
      },
      getSize: () => [150, 75], // width, height in pixels
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
      const fsPromises = await import("fs/promises")
      const pathModule = await import("path")
      const filePath = pathModule.join(process.cwd(), "public", template.file_path.replace(/^\//, ""))
      templateBuffer = await fsPromises.readFile(filePath) as any
    }

    // Load template with image module
    const zip = new PizZip(templateBuffer)
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

      // Wali kelas info
      nama_wali_kelas: siswa.kelas?.wali_kelas?.nama || "",
      nip_wali_kelas: siswa.kelas?.wali_kelas?.nip || "",
      // Image placeholder - convert cloud URL to local path (following sikap rapor pattern)
      tanda_tangan_wali_kelas: siswa.kelas?.wali_kelas?.tanda_tangan?.startsWith('https://')
        ? siswa.kelas?.wali_kelas?.tanda_tangan?.replace(
            'https://6uc7tvnigewtrcyh.public.blob.vercel-storage.com/',
            'uploads/signatures/'
          )
        : siswa.kelas?.wali_kelas?.tanda_tangan?.replace('/uploads/', 'uploads/') || "",

      // Metadata
      tgl_raport: formatTanggal(new Date()),
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