import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periode_ajaran_id = searchParams.get("periode_ajaran_id")
    const kelas_id = searchParams.get("kelas_id")

    if (!periode_ajaran_id || !kelas_id) {
      return NextResponse.json(
        { success: false, error: "periode_ajaran_id dan kelas_id wajib diisi" },
        { status: 400 }
      )
    }

    // Get all students in the specified class
    const students = await prisma.siswa.findMany({
      where: {
        kelas_id: Number.parseInt(kelas_id),
      },
      select: {
        id: true,
        nama: true,
        nis: true,
        kelas: {
          select: {
            nama_kelas: true,
            tingkatan: {
              select: {
                nama_tingkatan: true,
              },
            },
          },
        },
      },
      orderBy: { nama: "asc" },
    })

    // Get all attendance indicators
    const indicators = await prisma.indikatorKehadiran.findMany({
      orderBy: { nama_indikator: "asc" },
    })

    // Get existing attendance data for this class and period
    const existingAttendance = await prisma.kehadiran.findMany({
      where: {
        periode_ajaran_id: Number.parseInt(periode_ajaran_id),
        siswa: {
          kelas_id: Number.parseInt(kelas_id),
        },
      },
      include: {
        indikator_kehadiran: true,
      },
    })

    // Create a map for quick lookup of existing attendance
    const attendanceMap = new Map()
    existingAttendance.forEach(att => {
      const key = `${att.siswa_id}-${att.indikator_kehadiran_id}`
      attendanceMap.set(key, att)
    })

    // Build the response data
    const data = students.map(student => {
      const studentData: any = {
        siswa_id: student.id,
        nama: student.nama,
        nis: student.nis,
        kelas: `${student.kelas?.nama_kelas || ""} - ${student.kelas?.tingkatan?.nama_tingkatan || ""}`,
      }

      // Add columns for each indicator
      indicators.forEach(indicator => {
        const key = `${student.id}-${indicator.id}`
        const existing = attendanceMap.get(key)

        studentData[`indikator_${indicator.id}_sakit`] = existing?.sakit || 0
        studentData[`indikator_${indicator.id}_izin`] = existing?.izin || 0
        studentData[`indikator_${indicator.id}_alpha`] = existing?.alpha || 0
        studentData[`indikator_${indicator.id}_id`] = existing?.id || null
      })

      return studentData
    })

    return NextResponse.json({
      success: true,
      data,
      indicators,
      periode_ajaran_id: Number.parseInt(periode_ajaran_id),
      kelas_id: Number.parseInt(kelas_id),
    })
  } catch (error) {
    console.error("Error fetching kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kehadiran" }, { status: 500 })
  }
}
