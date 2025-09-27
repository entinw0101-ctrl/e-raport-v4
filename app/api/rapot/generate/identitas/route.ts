import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import { format } from "date-fns"
import { id } from "date-fns/locale"
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
      select: {
        nama: true,
        nis: true,
        tempat_lahir: true,
        tanggal_lahir: true,
        jenis_kelamin: true,
        agama: true,
        alamat: true,
        nama_ayah: true,
        pekerjaan_ayah: true,
        alamat_ayah: true,
        nama_ibu: true,
        pekerjaan_ibu: true,
        alamat_ibu: true,
        nama_wali: true,
        pekerjaan_wali: true,
        alamat_wali: true,
        kota_asal: true,
        kelas: {
          include: {
            wali_kelas: true,
            tingkatan: true,
          },
        },
        kamar: true,
      },
    })

    // Fetch kepala pesantren (assuming there's a guru with role kepala)
    const kepalaPesantren = await prisma.guru.findFirst({
      where: {
        // Add condition for kepala pesantren role if exists
        // For now, fetch first active guru or adjust as needed
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

    // Load template
    const zip = new PizZip(templateContent)
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
      nama: siswa.nama || '-',
      no_induk: siswa.nis || '-',
      ttl: `${siswa.tempat_lahir || ''}, ${formatTanggal(siswa.tanggal_lahir)}`,
      jk: siswa.jenis_kelamin === 'LAKI_LAKI' ? 'Laki-laki' : siswa.jenis_kelamin === 'PEREMPUAN' ? 'Perempuan' : '-',
      agama: siswa.agama || '-',
      alamat: siswa.alamat || '-',
      nama_ayah: siswa.nama_ayah || '-',
      kerja_ayah: siswa.pekerjaan_ayah || '-',
      alamat_ayah: siswa.alamat_ayah || '-',
      nama_ibu: siswa.nama_ibu || '-',
      kerja_ibu: siswa.pekerjaan_ibu || '-',
      alamat_ibu: siswa.alamat_ibu || '-',
      nama_wali: siswa.nama_wali || '-',
      kerja_wali: siswa.pekerjaan_wali || '-',
      alamat_wali: siswa.alamat_wali || '-',
      kelas: siswa.kelas?.nama_kelas || '-',
      wali_kelas: siswa.kelas?.wali_kelas?.nama || '-',

      // Placeholder disamakan dengan rapor nilai & sikap
      kepala_pesantren: kepalaPesantren?.nama || '-',
      nip_kepala_pesantren: kepalaPesantren?.nip || '-',

      tgl_raport: `Sumedang, ${formatTanggal(new Date())}`,
      kamar: siswa.kamar?.nama_kamar || '-',
      kota_asal: siswa.kota_asal || '-'
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