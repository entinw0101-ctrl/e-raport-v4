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

    // Fetch kehadiran data
    const kehadiran = await prisma.kehadiran.findMany({
      where: {
        siswa_id: parseInt(siswaId),
        periode_ajaran_id: parseInt(periodeAjaranId),
      },
      include: {
        indikator_kehadiran: true,
      },
      orderBy: {
        indikator_kehadiran: {
          nama_indikator: 'asc'
        }
      }
    })

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

    const avgSpiritual = spiritualItems.length > 0
      ? spiritualItems.reduce((sum, item) => sum + item.nilai, 0) / spiritualItems.length
      : 0

    const avgSosial = sosialItems.length > 0
      ? sosialItems.reduce((sum, item) => sum + item.nilai, 0) / sosialItems.length
      : 0

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: "LAPORAN SIKAP DAN KEHADIRAN SISWA",
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

          // Kehadiran Section
          new Paragraph({
            text: "KEHADIRAN",
            heading: HeadingLevel.HEADING_2,
          }),

          // Kehadiran Table
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
                    children: [new Paragraph({ text: "Indikator Kehadiran", bold: true })],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: "Sakit", bold: true })],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: "Izin", bold: true })],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: "Alpha", bold: true })],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: "Total", bold: true })],
                  }),
                ],
              }),
              ...kehadiran.map((k) => new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph(k.indikator_kehadiran.nama_indikator)],
                  }),
                  new TableCell({
                    children: [new Paragraph(k.sakit.toString())],
                  }),
                  new TableCell({
                    children: [new Paragraph(k.izin.toString())],
                  }),
                  new TableCell({
                    children: [new Paragraph(k.alpha.toString())],
                  }),
                  new TableCell({
                    children: [new Paragraph((k.sakit + k.izin + k.alpha).toString())],
                  }),
                ],
              })),
            ],
          }),

          new Paragraph({
            text: "",
          }),

          // Penilaian Sikap Section
          new Paragraph({
            text: "PENILAIAN SIKAP",
            heading: HeadingLevel.HEADING_2,
          }),

          // Spiritual Section
          ...(spiritualItems.length > 0 ? [
            new Paragraph({
              text: "Spiritual",
              heading: HeadingLevel.HEADING_3,
            }),
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
                      children: [new Paragraph({ text: "Indikator", bold: true })],
                    }),
                    new TableCell({
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({ text: "Nilai", bold: true })],
                    }),
                    new TableCell({
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({ text: "Predikat", bold: true })],
                    }),
                  ],
                }),
                ...spiritualItems.map((item) => new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph(item.indikator_sikap.indikator || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.nilai.toString())],
                    }),
                    new TableCell({
                      children: [new Paragraph(
                        item.nilai >= 90 ? 'A' : item.nilai >= 80 ? 'B' : item.nilai >= 70 ? 'C' : 'D'
                      )],
                    }),
                  ],
                })),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Rata-rata Spiritual", bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph(avgSpiritual.toFixed(1))],
                    }),
                    new TableCell({
                      children: [new Paragraph(
                        avgSpiritual >= 90 ? 'A' : avgSpiritual >= 80 ? 'B' : avgSpiritual >= 70 ? 'C' : 'D'
                      )],
                    }),
                  ],
                }),
              ],
            }),
            new Paragraph({ text: "" }),
          ] : []),

          // Sosial Section
          ...(sosialItems.length > 0 ? [
            new Paragraph({
              text: "Sosial",
              heading: HeadingLevel.HEADING_3,
            }),
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
                      children: [new Paragraph({ text: "Indikator", bold: true })],
                    }),
                    new TableCell({
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({ text: "Nilai", bold: true })],
                    }),
                    new TableCell({
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({ text: "Predikat", bold: true })],
                    }),
                  ],
                }),
                ...sosialItems.map((item) => new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph(item.indikator_sikap.indikator || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.nilai.toString())],
                    }),
                    new TableCell({
                      children: [new Paragraph(
                        item.nilai >= 90 ? 'A' : item.nilai >= 80 ? 'B' : item.nilai >= 70 ? 'C' : 'D'
                      )],
                    }),
                  ],
                })),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Rata-rata Sosial", bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph(avgSosial.toFixed(1))],
                    }),
                    new TableCell({
                      children: [new Paragraph(
                        avgSosial >= 90 ? 'A' : avgSosial >= 80 ? 'B' : avgSosial >= 70 ? 'C' : 'D'
                      )],
                    }),
                  ],
                }),
              ],
            }),
          ] : []),
        ],
      }],
    })

    // Generate buffer
    const buffer = await Packer.toBuffer(doc)

    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    headers.set('Content-Disposition', `attachment; filename="Sikap_${siswa.nama?.replace(/\s+/g, '_') || 'Siswa'}_${periodeAjaran.nama_ajaran}.docx"`)

    return new NextResponse(buffer, {
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