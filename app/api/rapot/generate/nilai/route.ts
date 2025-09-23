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

    // Calculate averages and rankings
    const nilaiUjian = data.nilaiUjians || []
    let totalNilai = 0
    const nilaiValid = nilaiUjian.filter((n: any) => n && typeof parseFloat(n.nilai_angka?.toString()) === 'number' && !isNaN(parseFloat(n.nilai_angka?.toString())))

    if (nilaiValid.length > 0) {
      totalNilai = nilaiValid.reduce((sum: number, n: any) => sum + parseFloat(n.nilai_angka?.toString() || '0'), 0)
    }

    const rata_akhir_angka = nilaiValid.length > 0 ? (totalNilai / nilaiValid.length).toFixed(2) : "0.00"
    const pred_akhir_predikat = getPredicate(parseFloat(rata_akhir_angka))

    // Calculate ranking (simplified)
    let peringkat = 'N/A'
    let total_siswa = 'N/A'

    if (data.siswa?.kelas_id) {
      // Get all students in the same class with their averages
      const semuaNilaiDiKelas = await prisma.nilaiUjian.findMany({
        where: {
          periode_ajaran_id: parseInt(periodeAjaranId),
          siswa: {
            kelas_id: data.siswa.kelas_id
          }
        },
        include: {
          siswa: true
        }
      })

      const rataRataSiswa: { [key: number]: { total: number; count: number } } = {}
      semuaNilaiDiKelas.forEach((n: any) => {
        const sId = n.siswa_id
        const nilai = parseFloat(n.nilai_angka?.toString() || '0')
        if (!isNaN(nilai)) {
          if (!rataRataSiswa[sId]) {
            rataRataSiswa[sId] = { total: 0, count: 0 }
          }
          rataRataSiswa[sId].total += nilai
          rataRataSiswa[sId].count++
        }
      })

      const peringkatList = Object.keys(rataRataSiswa).map(id => ({
        siswa_id: parseInt(id),
        rata_akhir: (rataRataSiswa[parseInt(id)].total / (rataRataSiswa[parseInt(id)].count || 1))
      })).sort((a, b) => b.rata_akhir - a.rata_akhir)

      total_siswa = peringkatList.length.toString()
      const rankIndex = peringkatList.findIndex(item => item.siswa_id === parseInt(siswaId))
      if (rankIndex !== -1) {
        peringkat = (rankIndex + 1).toString()
      }
    }

    const findKitab = (mapelId: number) => {
      const kurikulum = data.kurikulums.find((k: any) => k.mapel_id === mapelId)
      return kurikulum?.kitab?.nama_kitab || '-'
    }

    // Get semester from periode ajaran
    const semester = data.tahunAjaran?.semester === 'SATU' ? '1' : '2'

    const templateData: any = {
      semester_text: data.tahunAjaran?.semester === 'SATU' ? 'GANJIL' : 'GENAP',
      thn_ajaran: data.tahunAjaran?.nama_ajaran || 'N/A',
      thn_ajaran_hijriah: 'N/A', // TODO: Add Hijri conversion
      nama: data.siswa?.nama || 'N/A',
      no_induk: data.siswa?.nis || 'N/A',
      kota_asal: data.siswa?.kota_asal || data.siswa?.tempat_lahir || 'N/A',
      kelas: data.siswa?.kelas?.nama_kelas || 'N/A',
      wali_kelas: data.siswa?.kelas?.wali_kelas?.nama || 'N/A',
      nip_wali_kelas: data.siswa?.kelas?.wali_kelas?.nip || '-',
      kepala_pesantren: 'N/A', // TODO: Add KepalaPesantren
      nip_kepala_pesantren: 'N/A',

      mapel: nilaiUjian.map((n: any, i: number) => ({
        no: i + 1,
        nama_mapel: n.mata_pelajaran?.nama_mapel || 'Mapel Dihapus',
        kitab: findKitab(n.mapel_id),
        predikat: getPredicate(parseFloat(n.nilai_angka?.toString() || '0')),
        nilai: n.nilai_angka ? parseFloat(n.nilai_angka.toString()).toFixed(2) : "0.00"
      })),

      jml_nilai: totalNilai > 0 ? totalNilai.toFixed(2) : "N/A",
      rata_akhir: rata_akhir_angka !== "0.00" ? rata_akhir_angka : "N/A",
      pred_akhir: pred_akhir_predikat,
      peringkat: peringkat,
      total_siswa: total_siswa,

      hafalan: data.nilaiHafalans.map((n: any, i: number) => {
        const kurikulumTerkait = data.kurikulums.find((k: any) => k.mapel_id === n.mapel_id)
        return {
          no: i + 1,
          nama: n.mata_pelajaran?.nama_mapel || 'Mapel Dihapus',
          kitab: kurikulumTerkait?.kitab?.nama_kitab || '-',
          batas: kurikulumTerkait?.batas_hafalan || '-',
          predikat: n.predikat || '-'
        }
      }),

      kehadiran: data.kehadirans.map((k: any, i: number) => ({
        no: i + 1,
        kegiatan: k.indikator_kehadiran?.nama_indikator || 'Kegiatan Lain',
        izin: k.izin || 0,
        sakit: k.sakit || 0,
        absen: k.alpha || 0,
        total: (k.izin || 0) + (k.sakit || 0) + (k.alpha || 0)
      })),

      catatan_akademik: data.history?.catatan_akademik || '',
      catatan_sikap: data.history?.catatan_sikap || '',
    }

    // Handle signatures
    const placeholderTtd = fs.existsSync(PLACEHOLDER_TTD_PATH)
      ? fs.readFileSync(PLACEHOLDER_TTD_PATH)
      : null

    templateData.ttd_walikelas = placeholderTtd

    let outputBuffer = await generateDocx('nilai.docx', templateData)
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

    const fileName = `Raport_Nilai_${data.siswa?.nama?.replace(/\s+/g, '_') || 'Unknown'}.${extension}`

    const response = new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': contentType,
      },
    })

    return response

  } catch (error) {
    console.error('Error generating nilai report:', error)
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan saat membuat laporan nilai',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}