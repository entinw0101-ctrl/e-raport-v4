import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siswa_id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const periodeAjaranIdStr = searchParams.get("periode_ajaran_id")

    if (!periodeAjaranIdStr) {
      return NextResponse.json(
        { success: false, error: "periode_ajaran_id is required" },
        { status: 400 }
      )
    }

    const resolvedParams = await params
    const siswaId = parseInt(resolvedParams.siswa_id)
    const periodeAjaranId = parseInt(periodeAjaranIdStr)

    if (isNaN(siswaId) || isNaN(periodeAjaranId)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID format" },
        { status: 400 }
      )
    }

    // Run all queries in parallel for better performance
    const [
      siswa,
      nilaiUjian,
      nilaiHafalan,
      kehadiran,
      penilaianSikap,
      periodeAjaran
    ] = await Promise.all([
      // Fetch student data with all related information
      prisma.siswa.findUnique({
        where: { id: siswaId },
        include: {
          kelas: {
            include: {
              wali_kelas: true,
            },
          },
          kamar: true,
        },
      }),
      // Fetch nilai ujian
      prisma.nilaiUjian.findMany({
        where: {
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId,
        },
        include: {
          mata_pelajaran: true,
        },
      }),
      // Fetch nilai hafalan
      prisma.nilaiHafalan.findMany({
        where: {
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId,
        },
        include: {
          mata_pelajaran: true,
        },
      }),
      // Fetch kehadiran
      prisma.kehadiran.findMany({
        where: {
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId,
        },
        include: {
          indikator_kehadiran: true,
        },
      }),
      // Fetch penilaian sikap
      prisma.penilaianSikap.findMany({
        where: {
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId,
        },
        include: {
          indikator_sikap: true,
        },
      }),
      // Fetch periode ajaran
      prisma.periodeAjaran.findUnique({
        where: { id: periodeAjaranId },
        select: {
          nama_ajaran: true,
          semester: true,
        },
      })
    ])

    if (!siswa) {
      return NextResponse.json(
        { success: false, error: "Siswa tidak ditemukan" },
        { status: 404 }
      )
    }


    // Get kurikulum data for hafalan (only if there are hafalan records)
    let kurikulumData: any[] = []
    if (nilaiHafalan.length > 0) {
      kurikulumData = await prisma.kurikulum.findMany({
        where: {
          mapel_id: {
            in: nilaiHafalan.map(n => n.mapel_id)
          }
        },
        include: {
          kitab: true,
        },
      })
    }

    if (!periodeAjaran) {
      return NextResponse.json(
        { success: false, error: "Periode ajaran tidak ditemukan" },
        { status: 404 }
      )
    }

    // Get catatan siswa
    const catatanSiswa = await prisma.catatanSiswa.findFirst({
      where: {
        siswa_id: siswaId,
        periode_ajaran_id: periodeAjaranId,
      },
    })

    // Transform data to match the expected interface
    const transformedData = {
      siswa: {
        id: siswa.id.toString(),
        nama: siswa.nama || "",
        nis: siswa.nis,
        tempat_lahir: siswa.tempat_lahir || "",
        tanggal_lahir: siswa.tanggal_lahir?.toISOString() || "",
        jenis_kelamin: siswa.jenis_kelamin || "LAKI_LAKI",
        agama: siswa.agama || "",
        alamat: siswa.alamat || "",
        kelas: {
          nama_kelas: siswa.kelas?.nama_kelas || "",
          walikelas: {
            nama: siswa.kelas?.wali_kelas?.nama || "",
            nip: siswa.kelas?.wali_kelas?.nip || "",
          },
        },
        kamar: {
          nama_kamar: siswa.kamar?.nama_kamar || "",
        },
      },
      nilaiUjian: nilaiUjian.map((n) => ({
        id: n.id.toString(),
        nilai_angka: Number(n.nilai_angka),
        predikat: n.predikat || "",
        mata_pelajaran: {
          nama_mapel: n.mata_pelajaran.nama_mapel,
        },
      })),
      nilaiHafalan: nilaiHafalan.map((n) => {
        const kurikulum = kurikulumData.find(k => k.mapel_id === n.mapel_id)
        return {
          id: n.id.toString(),
          target_hafalan: kurikulum?.batas_hafalan || "",
          predikat: n.predikat === "TERCAPAI" ? "Tercapai" : n.predikat === "TIDAK_TERCAPAI" ? "Tidak Tercapai" : n.predikat,
          mata_pelajaran: {
            nama_mapel: n.mata_pelajaran.nama_mapel,
          },
          kurikulum: {
            kitab: {
              nama_kitab: kurikulum?.kitab?.nama_kitab || "",
            },
            batas_hafalan: kurikulum?.batas_hafalan || "",
          },
        }
      }),
      kehadiran: kehadiran.map((k) => ({
        id: k.id.toString(),
        sakit: k.sakit,
        izin: k.izin,
        alpha: k.alpha,
        indikator_kehadiran: {
          nama_indikator: k.indikator_kehadiran.nama_indikator,
        },
      })),
      penilaianSikap: penilaianSikap.map((p) => ({
        id: p.id.toString(),
        nilai: p.nilai,
        indikator_sikap: {
          jenis_sikap: p.indikator_sikap.jenis_sikap || "Spiritual",
          indikator: p.indikator_sikap.indikator || "",
        },
      })),
      catatanSiswa: catatanSiswa ? {
        catatan_sikap: catatanSiswa.catatan_sikap,
        catatan_akademik: catatanSiswa.catatan_akademik,
      } : null,
      periodeAjaran,
    }

    return NextResponse.json({
      success: true,
      data: transformedData,
    })
  } catch (error) {
    console.error("Error fetching student data:", error)
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data siswa" },
      { status: 500 }
    )
  }
}