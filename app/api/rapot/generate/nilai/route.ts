import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel } from "docx"

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

    // Fetch nilai ujian
    const nilaiUjian = await prisma.nilaiUjian.findMany({
      where: {
        siswa_id: parseInt(siswaId),
        periode_ajaran_id: parseInt(periodeAjaranId),
      },
      include: {
        mata_pelajaran: true,
      },
      orderBy: {
        mata_pelajaran: {
          nama_mapel: 'asc'
        }
      }
    })

    // Fetch nilai hafalan
    const nilaiHafalan = await prisma.nilaiHafalan.findMany({
      where: {
        siswa_id: parseInt(siswaId),
        periode_ajaran_id: parseInt(periodeAjaranId),
      },
      include: {
        mata_pelajaran: true,
      },
      orderBy: {
        mata_pelajaran: {
          nama_mapel: 'asc'
        }
      }
    })

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: "LAPORAN NILAI SISWA",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Nama: ${siswa.nama}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Kelas: ${siswa.kelas?.nama_kelas || ''}${siswa.kelas?.tingkatan ? ` (${siswa.kelas.tingkatan.nama_tingkatan})` : ''}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Periode: ${periodeAjaran.nama_ajaran} - Semester ${periodeAjaran.semester === 'SATU' ? '1' : '2'}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "",
          }),

          // Nilai Ujian Section
          new Paragraph({
            text: "NILAI UJIAN",
            heading: HeadingLevel.HEADING_2,
          }),

          // Nilai Ujian Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: "Mata Pelajaran", bold: true })],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: "Nilai", bold: true })],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: "Predikat", bold: true })],
                  }),
                ],
              }),
              ...nilaiUjian.map((nilai) => new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph(nilai.mata_pelajaran.nama_mapel)],
                  }),
                  new TableCell({
                    children: [new Paragraph(Number(nilai.nilai_angka).toString())],
                  }),
                  new TableCell({
                    children: [new Paragraph(nilai.predikat || "-")],
                  }),
                ],
              })),
            ],
          }),

          new Paragraph({
            text: "",
          }),

          // Nilai Hafalan Section
          new Paragraph({
            text: "NILAI HAFALAN",
            heading: HeadingLevel.HEADING_2,
          }),

          // Nilai Hafalan Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: "Mata Pelajaran", bold: true })],
                  }),
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: "Predikat", bold: true })],
                  }),
                ],
              }),
              ...nilaiHafalan.map((nilai) => new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph(nilai.mata_pelajaran.nama_mapel)],
                  }),
                  new TableCell({
                    children: [new Paragraph(nilai.predikat)],
                  }),
                ],
              })),
            ],
          }),
        ],
      }],
    })

    // Generate buffer
    const buffer = await Packer.toBuffer(doc)

    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    headers.set('Content-Disposition', `attachment; filename="Nilai_${siswa.nama?.replace(/\s+/g, '_') || 'Siswa'}_${periodeAjaran.nama_ajaran}.docx"`)

    return new NextResponse(buffer, {
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