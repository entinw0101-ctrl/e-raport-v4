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
import sizeOf from 'image-size'

export async function POST(request: NextRequest) {
  try {
    const { siswaId, periodeAjaranId, format: outputFormat = 'docx' } = await request.json()

    if (!siswaId || !periodeAjaranId) {
      return NextResponse.json(
        { success: false, error: "siswaId dan periodeAjaranId wajib diisi" },
        { status: 400 }
      )
    }

    const result = await generateLaporanNilai(siswaId, periodeAjaranId, { isAdmin: true })

    if (!result.canGenerate) {
      return NextResponse.json(
        { success: false, error: result.error, warnings: result.warnings },
        { status: 400 }
      )
    }

    const reportData = result.data!

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

    let waliKelasSignatureBuffer: Buffer = Buffer.alloc(0)
    const signature = siswa.kelas?.wali_kelas?.tanda_tangan
    if (signature) {
      if (signature.startsWith('https://')) {
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
        try {
          const localPath = path.join(process.cwd(), 'public', signature.replace(/^\//, ''))
          waliKelasSignatureBuffer = fs.readFileSync(localPath)
        } catch (error) {
          console.error('Error reading local signature:', error)
        }
      }
    }

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

    const imageOpts = {
      getImage: (tagValue: string) => {
        if (tagValue === 'wali_kelas_signature') {
          return waliKelasSignatureBuffer
        }
        return Buffer.alloc(0)
      },
      getSize: (imgBuffer: Buffer) => {
        if (!imgBuffer || imgBuffer.length === 0) {
            return [150, 75]; // Fallback jika buffer kosong
        }
        try {
          const dimensions = sizeOf(imgBuffer);
          const maxWidth = 150; 

          if (dimensions.width && dimensions.height) {
            const ratio = dimensions.width / dimensions.height;
            const newHeight = Math.round(maxWidth / ratio);
            return [maxWidth, newHeight];
          }
        } catch (e) {
          console.error("Gagal membaca dimensi gambar:", e);
        }
        return [150, 75]; // Fallback jika terjadi error
      },
    }

    let templateContent: Buffer;
    if (template.file_path.startsWith('https://')) {
        const response = await fetch(template.file_path);
        if (!response.ok) {
            throw new Error("Gagal mengambil template dari storage");
        }
        const arrayBuffer = await response.arrayBuffer();
        templateContent = Buffer.from(arrayBuffer);
    } else {
        const templatePath = path.join(process.cwd(), 'public', template.file_path.replace(/^\//, ""));
        templateContent = fs.readFileSync(templatePath);
    }

    const zip = new PizZip(templateContent)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [new ImageModule(imageOpts)],
    })

    const formatTanggal = (date: Date | string | null) => {
      if (!date) return '-'
      return format(new Date(date), "dd MMMM yyyy", { locale: id })
    }

    const data = {
      nama: reportData.header.nama,
      no_induk: reportData.header.nis,
      kota_asal: reportData.header.kotaAsal,
      kelas: siswa.kelas?.nama_kelas || 'N/A',
      semester_text: reportData.header.semester,
      thn_ajaran: reportData.header.tahunAjaran,
      thn_ajaran_hijriah: reportData.header.tahunAjaranHijriah,
      semester: reportData.header.semester,
      tahun_ajaran: reportData.header.tahunAjaran,
      tahun_ajaran_hijriah: reportData.header.tahunAjaranHijriah,
      total_nilai_ujian: reportData.totalNilaiUjian,
      rata_rata_ujian: reportData.rataRataUjian,
      rata_pred_akhir: reportData.rataRataPredikatUjian,
      peringkat: reportData.peringkat || '-',
      total_siswa: reportData.totalSiswa || '-',
      status_hafalan: reportData.statusHafalan,
      catatan_akademik: reportData.catatanAkademik,
      nilai_ujian: reportData.nilaiUjian.map((item: any, index: number) => ({
        no: index + 1,
        mata_pelajaran: item.mataPelajaran,
        kitab: item.kitab,
        nilai: item.nilai,
        predikat: item.predikat
      })),
      nilai_hafalan: reportData.nilaiHafalan.map((item: any, index: number) => ({
        no: index + 1,
        mata_pelajaran: item.mataPelajaran,
        kitab: item.kitab,
        batas_hafalan: item.batasHafalan,
        target_hafalan: item.targetHafalan,
        predikat: item.predikat
      })),
      kehadiran: reportData.kehadiran.map((item: any, index: number) => ({
        no: index + 1,
        indikator_kehadiran: item.indikatorKehadiran,
        sakit: item.sakit,
        izin: item.izin,
        alpha: item.alpha,
        total: item.sakit + item.izin + item.alpha
      })),
      nama_wali_kelas: siswa.kelas?.wali_kelas?.nama || "",
      nip_wali_kelas: siswa.kelas?.wali_kelas?.nip || "",
      tanda_tangan_wali_kelas: 'wali_kelas_signature',
      tgl_raport: `Sumedang, ${formatTanggal(new Date())}`,
    }

    doc.render(data)

    const outputBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    })

    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    headers.set('Content-Disposition', `attachment; filename="Nilai_${reportData.header.nama?.replace(/\s+/g, '_') || 'Siswa'}_${reportData.header.tahunAjaran}.docx"`)

    // DIUBAH: Konversi Node.js Buffer ke Uint8Array, yang merupakan BlobPart valid
    const uint8Array = Uint8Array.from(outputBuffer);
    const blob = new Blob([uint8Array]);

    return new NextResponse(blob, {
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