 import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import libre from 'libreoffice-convert'
import { formatTanggal } from '@/lib/raport-utils'

const prisma = new PrismaClient()

// Promisify libreoffice convert
const convertAsync = promisify(libre.convert)

const PLACEHOLDER_TTD_PATH = path.resolve(process.cwd(), 'public/placeholder-signature.png')

async function generateDocx(templateName: string, data: any): Promise<Buffer> {
  const templatePath = path.resolve(process.cwd(), `public/templates/${templateName}`)
  if (!fs.existsSync(templatePath)) throw new Error(`Template ${templateName} tidak ditemukan.`)

  const content = fs.readFileSync(templatePath, 'binary')
  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  })

  doc.render(data)
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}

export async function POST(request: NextRequest) {
  try {
    const { siswaId, periodeAjaranId, format = 'docx' } = await request.json()

    if (!siswaId || !periodeAjaranId) {
      return NextResponse.json({
        success: false,
        message: 'siswaId dan periodeAjaranId diperlukan'
      }, { status: 400 })
    }

    // Get siswa data
    const siswa = await prisma.siswa.findUnique({
      where: { id: parseInt(siswaId) },
      include: {
        kelas: {
          include: {
            wali_kelas: true
          }
        },
        kamar: true
      }
    })

    if (!siswa) {
      return NextResponse.json({
        success: false,
        message: 'Siswa tidak ditemukan'
      }, { status: 404 })
    }

    // Get kepala pesantren (placeholder for now)
    const kepalaPesantren = null // TODO: Add KepalaPesantren model

    // Prepare template data
    const templateData: any = {
      nama: siswa.nama || '-',
      no_induk: siswa.nis,
      ttl: `${siswa.tempat_lahir || ''}, ${formatTanggal(siswa.tanggal_lahir)}`,
      jk: siswa.jenis_kelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
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
      kepala_pesantren: '-', // Placeholder
      nip_kepala_pesantren: '-', // Placeholder
      tgl_raport: formatTanggal(new Date()),
      kamar: siswa.kamar?.nama_kamar || '-',
      kota_asal: siswa.kota_asal || '-'
    }

    // Handle signatures (placeholders for now)
    const placeholderTtd = fs.existsSync(PLACEHOLDER_TTD_PATH)
      ? fs.readFileSync(PLACEHOLDER_TTD_PATH)
      : null

    templateData.ttd_walikelas = placeholderTtd
    templateData.ttd_kepsek = placeholderTtd

    // Generate document
    let outputBuffer = await generateDocx('identitas.docx', templateData)
    let contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    let extension = 'docx'

    if (format === 'pdf') {
      try {
        outputBuffer = await convertAsync(outputBuffer, '.pdf', undefined)
        contentType = 'application/pdf'
        extension = 'pdf'
      } catch (error) {
        console.warn('PDF conversion failed, returning DOCX:', error)
        // Fall back to DOCX if PDF conversion fails
      }
    }

    const fileName = `Identitas_${siswa.nama?.replace(/\s+/g, '_') || 'Unknown'}.${extension}`

    // Return file as download
    const response = new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': contentType,
      },
    })

    return response

  } catch (error) {
    console.error('Error generating identitas report:', error)
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan saat membuat identitas',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}