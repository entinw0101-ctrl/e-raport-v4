import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateLaporanNilai } from "@/lib/raport-utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kelasId = searchParams.get("kelas_id")
    const periodeAjaranId = searchParams.get("periode_ajaran_id")

    if (!kelasId || !periodeAjaranId) {
      return NextResponse.json(
        { success: false, error: "kelas_id dan periode_ajaran_id wajib diisi" },
        { status: 400 }
      )
    }

    // Get all active students in the class
    const siswaAktif = await prisma.siswa.findMany({
      where: {
        kelas_id: parseInt(kelasId),
        status: "Aktif"
      },
      select: {
        id: true,
        nama: true,
        nis: true
      },
      orderBy: {
        nama: "asc"
      }
    })

    if (siswaAktif.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tidak ada siswa aktif di kelas ini" },
        { status: 404 }
      )
    }

    // Get report status for each student
    const studentsWithStatus = await Promise.all(
      siswaAktif.map(async (siswa) => {
        try {
          const result = await generateLaporanNilai(
            siswa.id.toString(),
            periodeAjaranId,
            { isAdmin: true }
          )

          return {
            id: siswa.id,
            nama: siswa.nama,
            nis: siswa.nis,
            report_status: result.reportStatus || 'not_ready',
            can_generate: result.canGenerate,
            peringkat: result.data?.peringkat || null,
            total_siswa: result.data?.totalSiswa || 0,
            warnings: result.warnings
          }
        } catch (error) {
          console.error(`Error checking status for student ${siswa.id}:`, error)
          return {
            id: siswa.id,
            nama: siswa.nama,
            nis: siswa.nis,
            report_status: 'error' as const,
            can_generate: false,
            peringkat: null,
            total_siswa: 0,
            warnings: ['Error checking report status']
          }
        }
      })
    )

    // Group students by status for easy filtering
    const groupedStudents = {
      ready: studentsWithStatus.filter(s => s.report_status === 'ready'),
      partial: studentsWithStatus.filter(s => s.report_status === 'partial'),
      not_ready: studentsWithStatus.filter(s => s.report_status === 'not_ready'),
      error: studentsWithStatus.filter(s => s.report_status === 'error')
    }

    return NextResponse.json({
      success: true,
      kelas_id: kelasId,
      periode_ajaran_id: periodeAjaranId,
      total_students: siswaAktif.length,
      summary: {
        ready: groupedStudents.ready.length,
        partial: groupedStudents.partial.length,
        not_ready: groupedStudents.not_ready.length,
        error: groupedStudents.error.length
      },
      students: studentsWithStatus,
      grouped: groupedStudents
    })

  } catch (error) {
    console.error("Error getting eligible students:", error)
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data siswa eligible" },
      { status: 500 }
    )
  }
}