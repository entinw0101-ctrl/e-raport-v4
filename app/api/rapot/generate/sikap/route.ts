import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import libre from 'libreoffice-convert'
import { getFullRaportData, getPredicate, formatTanggal, calculateAverage } from '@/lib/raport-utils'

const prisma = new PrismaClient()
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

    // Get full report data
    const data = await getFullRaportData(siswaId, '1', periodeAjaranId.toString()) // Default semester 1

    // Process sikap data
    const sikaps = data.sikaps || []

    // Get catatan wali kelas
    const catatanWaliKelasRecords = sikaps.filter((s: any) => s.indikator_sikap?.indikator === 'Catatan Wali Kelas' && s.deskripsi)
    const latestCatatan = catatanWaliKelasRecords[catatanWaliKelasRecords.length - 1]
    const catatanWaliKelasText = latestCatatan?.deskripsi || 'Teruslah beristiqomah dalam ibadah dan berakhlak mulia.'

    // Get scored sikaps (excluding catatan)
    const scoredSikaps = sikaps.filter((s: any) => s.indikator_sikap?.indikator !== 'Catatan Wali Kelas' && s.nilai !== null)

    // Categorize and calculate averages
    const sikapSpiritual = scoredSikaps.filter((s: any) => s.indikator_sikap?.jenis_sikap === 'Spiritual')
    const sikapSosial = scoredSikaps.filter((s: any) => s.indikator_sikap?.jenis_sikap === 'Sosial')
    const rataSpiritual = calculateAverage(sikapSpiritual, 'nilai')
    const rataSosial = calculateAverage(sikapSosial, 'nilai')
    const nilaiAkhir = calculateAverage(scoredSikaps, 'nilai')

    const templateData: any = {
      semester_text: data.tahunAjaran?.semester === 'SATU' ? 'GANJIL' : 'GENAP',
      thn_ajaran: data.tahunAjaran?.nama_ajaran || 'N/A',
      thn_ajaran_hijriah: 'N/A', // TODO: Add Hijri conversion
      semester: data.tahunAjaran?.semester || 'N/A',
      nama: data.siswa?.nama || 'N/A',
      ttl: `${data.siswa?.tempat_lahir || ''}, ${formatTanggal(data.siswa?.tanggal_lahir)}`,
      no_induk: data.siswa?.nis || 'N/A',
      kamar: data.siswa?.kamar?.nama_kamar || 'N/A',
      wali_kelas: data.siswa?.kelas?.wali_kelas?.nama || 'N/A',
      nip_wali_kelas: data.siswa?.kelas?.wali_kelas?.nip || 'N/A',
      kepala_pesantren: 'N/A', // TODO: Add KepalaPesantren
      nip_kepala_pesantren: 'N/A',

      sikap_s: sikapSpiritual.map((s: any, i: number) => ({
        no: i + 1,
        indikator: s.indikator_sikap?.indikator || 'Indikator tidak tersedia',
        angka: s.nilai,
        predikat: getPredicate(s.nilai)
      })),

      sikap_o: sikapSosial.map((s: any, i: number) => ({
        no: i + 1,
        indikator: s.indikator_sikap?.indikator || 'Indikator tidak tersedia',
        angka: s.nilai,
        predikat: getPredicate(s.nilai)
      })),

      deskripsi_catatan_walikelas: catatanWaliKelasText,

      rata_ss: rataSpiritual,
      pred_ss: getPredicate(parseFloat(rataSpiritual)),
      rata_so: rataSosial,
      pred_so: getPredicate(parseFloat(rataSosial)),
      nilai_akhir_sikap: nilaiAkhir,
      pred_akhir_sikap: getPredicate(parseFloat(nilaiAkhir))
    }

    // Handle signatures
    const placeholderTtd = fs.existsSync(PLACEHOLDER_TTD_PATH)
      ? fs.readFileSync(PLACEHOLDER_TTD_PATH)
      : null

    templateData.ttd_walikelas = placeholderTtd

    let outputBuffer = await generateDocx('sikap.docx', templateData)
    let contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    let extension = 'docx'

    if (format === 'pdf') {
      try {
        outputBuffer = await convertAsync(outputBuffer, '.pdf', undefined)
        contentType = 'application/pdf'
        extension = 'pdf'
      } catch (error) {
        console.warn('PDF conversion failed, returning DOCX:', error)
      }
    }

    const fileName = `Raport_Sikap_${data.siswa?.nama?.replace(/\s+/g, '_') || 'Unknown'}.${extension}`

    const response = new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': contentType,
      },
    })

    return response

  } catch (error) {
    console.error('Error generating sikap report:', error)
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan saat membuat laporan sikap',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}