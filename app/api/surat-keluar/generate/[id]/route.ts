import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import fs from "fs"
import path from "path"

function formatTanggal(tgl: Date | string | null): string {
  if (!tgl) return ''
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const d = new Date(tgl)
  const day = String(d.getDate()).padStart(2,'0')
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const suratId = parseInt(resolvedParams.id)

    if (isNaN(suratId)) {
      return NextResponse.json(
        { success: false, error: "ID surat tidak valid" },
        { status: 400 }
      )
    }

    // Get surat keluar with student details
    const suratKeluar = await prisma.suratKeluar.findUnique({
      where: { id: suratId },
      include: {
        siswa: {
          include: {
            kelas: {
              include: {
                wali_kelas: true,
                tingkatan: true
              }
            },
            kamar: true
          }
        }
      }
    })

    if (!suratKeluar) {
      return NextResponse.json(
        { success: false, error: "Surat keluar tidak ditemukan" },
        { status: 404 }
      )
    }

    if (!suratKeluar.siswa) {
      return NextResponse.json(
        { success: false, error: "Data siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    // Get template for surat keluar
    const template = await prisma.templateDokumen.findFirst({
      where: {
        jenis_template: "SURAT_KELUAR",
        is_active: true,
      },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template surat keluar tidak ditemukan. Silakan upload template terlebih dahulu." },
        { status: 404 }
      )
    }

    // Load template file
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

    // Cast to any to bypass TypeScript errors until Prisma client is regenerated
    const surat = suratKeluar as any

    // Debug: Log the surat data
    console.log('Surat data for template:', {
      penanggung_nama: surat.penanggung_nama,
      penanggung_pekerjaan: surat.penanggung_pekerjaan,
      penanggung_alamat: surat.penanggung_alamat,
    })

    // Prepare data for template
    const data = {
      // Data Surat
      nomor_surat: surat.nomor_surat,
      tanggal_surat: formatTanggal(surat.tanggal_surat),

      // Data Siswa
      siswa_nama: surat.siswa.nama || '',
      siswa_nis: surat.siswa.nis,
      siswa_ttl: `${surat.siswa.tempat_lahir || ''}, ${formatTanggal(surat.siswa.tanggal_lahir)}`,
      siswa_jenis_kelamin: surat.siswa.jenis_kelamin || '',
      siswa_agama: surat.siswa.agama || '',
      siswa_kelas: surat.siswa.kelas?.nama_kelas || '',
      siswa_kamar: surat.siswa.kamar?.nama_kamar || '',

      // Data Orang Tua/Wali
      ortu_nama: surat.penanggung_nama || '',
      ortu_pekerjaan: surat.penanggung_pekerjaan || '',
      ortu_alamat: surat.penanggung_alamat || '',

      // Data Tujuan (for pindah)
      tujuan_nama_pesantren: surat.tujuan_nama_pesantren || '',
      tujuan_alamat_pesantren: surat.tujuan_alamat_pesantren || '',

      // Alasan (for keluar)
      alasan: surat.alasan || '',

      // Jenis keluar
      jenis_keluar: surat.jenis_keluar || '',

      // Penanggung jawab
      penanggung_jawab: surat.penanggung_jawab || '',
      penanggung_nama: surat.penanggung_nama || '',

      // Additional fields that might be in template
      perihal: surat.perihal || '',
      isi_surat: surat.isi_surat || '',
    }

    // Set template data
    doc.render(data)

    // Generate output buffer
    const outputBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    })

    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    headers.set('Content-Disposition', `attachment; filename="Surat_Keluar_${surat.siswa.nama?.replace(/\s+/g, '_') || 'Siswa'}_${surat.jenis_keluar}_${surat.nomor_surat.replace(/\//g, '_')}.docx"`)

    return new NextResponse(outputBuffer as any, {
      status: 200,
      headers,
    })

  } catch (error) {
    console.error("Error generating surat keluar:", error)
    return NextResponse.json(
      { success: false, error: "Gagal generate surat keluar" },
      { status: 500 }
    )
  }
}