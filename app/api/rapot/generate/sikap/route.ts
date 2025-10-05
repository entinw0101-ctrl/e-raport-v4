import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import ImageModule from "docxtemplater-image-module-free"
import fs from "fs"
import path from "path"
import sizeOf from 'image-size'
import { getPredicate, getSikapPredicate, formatTanggal } from "@/lib/raport-utils"

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

    // Fetch penanggung jawab based on student gender
    const penanggungJawab = await prisma.penanggungJawabRapot.findFirst({
      where: {
        jenis_kelamin_target: siswa.jenis_kelamin === "LAKI_LAKI" ? "LAKI_LAKI" : "PEREMPUAN",
        status: "aktif"
      }
    })

    if (!penanggungJawab) {
      throw new Error(`Penanggung jawab untuk ${siswa.jenis_kelamin} tidak ditemukan`)
    }

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
        ? `${siswa.tempat_lahir}, ${formatTanggal(siswa.tanggal_lahir)}`
        : siswa.tempat_lahir || formatTanggal(siswa.tanggal_lahir) || "",
      kamar: siswa.kamar?.nama_kamar || "",

      // Semester info
      semester: periodeAjaran.semester === 'SATU' ? '1' : '2',
      thn_ajaran: periodeAjaran.nama_ajaran,

      // Spiritual sikap items (with numbering)
      sikap_s: spiritualItems.map((item, index) => ({
        no: index + 1,
        indikator: item.indikator_sikap.indikator || "",
        angka: item.nilai,
        predikat: getSikapPredicate(item.nilai)
      })),

      // Sosial sikap items (with numbering)
      sikap_o: sosialItems.map((item, index) => ({
        no: index + 1,
        indikator: item.indikator_sikap.indikator || "",
        angka: item.nilai,
        predikat: getSikapPredicate(item.nilai)
      })),

      // Averages and final scores
      rata_ss: Math.round(rataSs * 100) / 100,
      pred_ss: getSikapPredicate(rataSs),
      rata_so: Math.round(rataSo * 100) / 100,
      pred_so: getSikapPredicate(rataSo),
      nilai_akhir_sikap: Math.round(nilaiAkhirSikap * 100) / 100,
      pred_akhir_sikap: getSikapPredicate(nilaiAkhirSikap),

      // Catatan sikap
      catatan_sikap: catatanSiswa?.catatan_sikap || "",

      // Penanggung jawab
      jabatan_penanggung_jawab: penanggungJawab.jabatan,
      nama_penanggung_jawab: penanggungJawab.nama_pejabat,
      nip_penanggung_jawab: penanggungJawab.nip || "",
      // Image placeholder
      tanda_tangan_penanggung_jawab: 'tanda_tangan_penanggung_jawab',

      // Metadata
      tgl_raport: `Sumedang, ${formatTanggal(new Date())}`
    }

    // Setup image module for signature
    let penanggungJawabSignatureBuffer: Buffer = Buffer.alloc(0)
    const signature = penanggungJawab.tanda_tangan
    if (signature) {
      if (signature.startsWith('https://')) {
        try {
          const response = await fetch(signature)
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            penanggungJawabSignatureBuffer = Buffer.from(arrayBuffer)
          }
        } catch (error) {
          console.error('Error fetching signature from blob:', error)
        }
      } else {
        try {
          const localPath = path.join(process.cwd(), 'public', signature.replace(/^\//, ''))
          penanggungJawabSignatureBuffer = fs.readFileSync(localPath)
        } catch (error) {
          console.error('Error reading local signature:', error)
        }
      }
    }

    const imageOpts = {
      getImage: (tagValue: string) => {
        if (tagValue === 'tanda_tangan_penanggung_jawab') {
          return penanggungJawabSignatureBuffer
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

    // Load template
    const templatePath = path.join(process.cwd(), 'public/uploads/templates/template_sikap_1758891177667.docx')
    const templateContent = fs.readFileSync(templatePath, 'binary')

    const zip = new PizZip(templateContent)
    // @ts-ignore - Image module doesn't have proper types
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [new ImageModule(imageOpts)],
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