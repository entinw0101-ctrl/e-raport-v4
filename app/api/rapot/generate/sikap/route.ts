import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import fs from "fs"
import path from "path"
import { getPredicate } from "@/lib/raport-utils"

export async function POST(request: NextRequest) {
  try {
    const { siswaId, periodeAjaranId, format = 'docx' } = await request.json()

    if (!siswaId || !periodeAjaranId) {
      return NextResponse.json(
        { success: false, error: "siswaId dan periodeAjaranId wajib diisi" },
        { status: 400 }
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

    // Fetch penilaian sikap
    const penilaianSikap = await prisma.penilaianSikap.findMany({
      where: {
        siswa_id: parseInt(siswaId),
        periode_ajaran_id: parseInt(periodeAjaranId),
      },
      include: {
        indikator_sikap: true,
      },
      orderBy: [
        {
          indikator_sikap: {
            jenis_sikap: 'asc'
          }
        },
        {
          indikator_sikap: {
            indikator: 'asc'
          }
        }
      ]
    })

    // Fetch catatan siswa
    const catatanSiswa = await prisma.catatanSiswa.findUnique({
      where: {
        siswa_id_periode_ajaran_id: {
          siswa_id: parseInt(siswaId),
          periode_ajaran_id: parseInt(periodeAjaranId)
        }
      }
    })

    // Group penilaian sikap by jenis_sikap
    const sikapByJenis = penilaianSikap.reduce((acc, item) => {
      const jenis = item.indikator_sikap.jenis_sikap || 'Spiritual'
      if (!acc[jenis]) {
        acc[jenis] = []
      }
      acc[jenis].push(item)
      return acc
    }, {} as Record<string, typeof penilaianSikap>)

    // Calculate averages
    const spiritualItems = sikapByJenis['Spiritual'] || []
    const sosialItems = sikapByJenis['Sosial'] || []

    const rataSs = spiritualItems.length > 0
      ? spiritualItems.reduce((sum, item) => sum + item.nilai, 0) / spiritualItems.length
      : 0

    const rataSo = sosialItems.length > 0
      ? sosialItems.reduce((sum, item) => sum + item.nilai, 0) / sosialItems.length
      : 0

    // Calculate final sikap score (average of spiritual and sosial)
    const nilaiAkhirSikap = (rataSs + rataSo) / 2

    // Prepare template data
    const templateData = {
      // Basic info
      nama: siswa.nama || "",
      no_induk: siswa.nis || "",
      ttl: siswa.tempat_lahir && siswa.tanggal_lahir
        ? `${siswa.tempat_lahir}, ${new Date(siswa.tanggal_lahir).toLocaleDateString('id-ID')}`
        : "",
      kamar: siswa.kamar?.nama_kamar || "",

      // Semester info
      semester: periodeAjaran.semester === 'SATU' ? '1' : '2',
      thn_ajaran: periodeAjaran.nama_ajaran,

      // Spiritual sikap items (with numbering)
      sikap_s: spiritualItems.map((item, index) => ({
        no: index + 1,
        indikator: item.indikator_sikap.indikator || "",
        angka: item.nilai,
        predikat: getPredicate(item.nilai)
      })),

      // Sosial sikap items (with numbering)
      sikap_o: sosialItems.map((item, index) => ({
        no: index + 1,
        indikator: item.indikator_sikap.indikator || "",
        angka: item.nilai,
        predikat: getPredicate(item.nilai)
      })),

      // Averages and final scores
      rata_ss: Math.round(rataSs * 100) / 100,
      pred_ss: getPredicate(rataSs),
      rata_so: Math.round(rataSo * 100) / 100,
      pred_so: getPredicate(rataSo),
      nilai_akhir_sikap: Math.round(nilaiAkhirSikap * 100) / 100,
      pred_akhir_sikap: getPredicate(nilaiAkhirSikap),

      // Catatan sikap
      catatan_sikap: catatanSiswa?.catatan_sikap || "",

      // Metadata
      tgl_raport: new Date().toLocaleDateString('id-ID')
    }

    // Load template
    const templatePath = path.join(process.cwd(), 'public/uploads/templates/template_sikap_1758891177667.docx')
    const templateContent = fs.readFileSync(templatePath, 'binary')

    const zip = new PizZip(templateContent)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })

    // Set template data
    doc.render(templateData)

    // Generate buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    headers.set('Content-Disposition', `attachment; filename="Sikap_${siswa.nama?.replace(/\s+/g, '_') || 'Siswa'}_${periodeAjaran.nama_ajaran}.docx"`)

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers,
    })

  } catch (error) {
    console.error("Error generating sikap report:", error)
    return NextResponse.json(
      { success: false, error: "Gagal generate laporan sikap" },
      { status: 500 }
    )
  }
}