import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { siswa_id, periode_ajaran_id } = await request.json()

    if (!siswa_id || !periode_ajaran_id) {
      return NextResponse.json(
        { success: false, error: "siswa_id dan periode_ajaran_id wajib diisi" },
        { status: 400 }
      )
    }

    // Get student data
    const siswa = await prisma.siswa.findUnique({
      where: { id: parseInt(siswa_id) },
      select: { id: true, nama: true }
    })

    if (!siswa) {
      return NextResponse.json(
        { success: false, error: "Siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    // Get periode ajaran
    const periodeAjaran = await prisma.periodeAjaran.findUnique({
      where: { id: parseInt(periode_ajaran_id) },
      select: { id: true, nama_ajaran: true, semester: true }
    })

    if (!periodeAjaran) {
      return NextResponse.json(
        { success: false, error: "Periode ajaran tidak ditemukan" },
        { status: 404 }
      )
    }

    // Calculate attendance summary
    const kehadiran = await prisma.kehadiran.findMany({
      where: {
        siswa_id: parseInt(siswa_id),
        periode_ajaran_id: parseInt(periode_ajaran_id),
      },
    })

    const totalSakit = kehadiran.reduce((sum, k) => sum + k.sakit, 0)
    const totalIzin = kehadiran.reduce((sum, k) => sum + k.izin, 0)
    const totalAlpha = kehadiran.reduce((sum, k) => sum + k.alpha, 0)

    // Calculate spiritual and social averages
    const penilaianSikap = await prisma.penilaianSikap.findMany({
      where: {
        siswa_id: parseInt(siswa_id),
        periode_ajaran_id: parseInt(periode_ajaran_id),
      },
      include: {
        indikator_sikap: true,
      },
    })

    const spiritualItems = penilaianSikap.filter(p => p.indikator_sikap.jenis_sikap === "Spiritual")
    const sosialItems = penilaianSikap.filter(p => p.indikator_sikap.jenis_sikap === "Sosial")

    const rataRataSpiritual = spiritualItems.length > 0
      ? spiritualItems.reduce((sum, item) => sum + item.nilai, 0) / spiritualItems.length
      : null

    const rataRataSosial = sosialItems.length > 0
      ? sosialItems.reduce((sum, item) => sum + item.nilai, 0) / sosialItems.length
      : null

    // Generate predikat akhir sikap
    let predikatAkhirSikap = null
    if (rataRataSpiritual !== null && rataRataSosial !== null) {
      const avgSikap = (rataRataSpiritual + rataRataSosial) / 2
      if (avgSikap >= 90) predikatAkhirSikap = "Sempurna"
      else if (avgSikap >= 80) predikatAkhirSikap = "Sangat Baik"
      else if (avgSikap >= 70) predikatAkhirSikap = "Baik"
      else predikatAkhirSikap = "Kurang"
    }

    // Get catatan from CatatanSiswa
    const catatanSiswa = await prisma.catatanSiswa.findFirst({
      where: {
        siswa_id: parseInt(siswa_id),
        periode_ajaran_id: parseInt(periode_ajaran_id),
      },
    })

    // Upsert ringkasan_rapot
    const ringkasanRapot = await prisma.ringkasanRapot.upsert({
      where: {
        siswa_id_periode_ajaran_id: {
          siswa_id: parseInt(siswa_id),
          periode_ajaran_id: parseInt(periode_ajaran_id),
        },
      },
      update: {
        total_sakit: totalSakit,
        total_izin: totalIzin,
        total_alpha: totalAlpha,
        rata_rata_spiritual: rataRataSpiritual ? Math.round(rataRataSpiritual * 100) / 100 : null,
        rata_rata_sosial: rataRataSosial ? Math.round(rataRataSosial * 100) / 100 : null,
        predikat_akhir_sikap: predikatAkhirSikap,
        catatan_sikap: catatanSiswa?.catatan_sikap || null,
        catatan_akademik: catatanSiswa?.catatan_akademik || null,
      },
      create: {
        siswa_id: parseInt(siswa_id),
        periode_ajaran_id: parseInt(periode_ajaran_id),
        total_sakit: totalSakit,
        total_izin: totalIzin,
        total_alpha: totalAlpha,
        rata_rata_spiritual: rataRataSpiritual ? Math.round(rataRataSpiritual * 100) / 100 : null,
        rata_rata_sosial: rataRataSosial ? Math.round(rataRataSosial * 100) / 100 : null,
        predikat_akhir_sikap: predikatAkhirSikap,
        catatan_sikap: catatanSiswa?.catatan_sikap || null,
        catatan_akademik: catatanSiswa?.catatan_akademik || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: ringkasanRapot,
      message: "Ringkasan rapot berhasil di-generate",
    })
  } catch (error) {
    console.error("Error generating rapot summary:", error)
    return NextResponse.json(
      { success: false, error: "Gagal generate ringkasan rapot" },
      { status: 500 }
    )
  }
}