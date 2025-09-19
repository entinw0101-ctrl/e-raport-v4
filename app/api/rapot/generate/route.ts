import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)
    const { siswaId, periodeAjaranId, semester } = await request.json()

    const { data: existingRapot } = await supabase
      .from("ringkasan_rapot")
      .select("*")
      .eq("siswa_id", siswaId)
      .eq("periode_ajaran_id", periodeAjaranId)
      .eq("semester", semester)
      .single()

    if (existingRapot) {
      const lastUpdated = new Date(existingRapot.updated_at)
      const now = new Date()
      const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)

      if (hoursDiff < 24) {
        // Cache for 24 hours
        return NextResponse.json({
          rapot: existingRapot.data_rapot,
          cached: true,
          lastUpdated: existingRapot.updated_at,
        })
      }
    }

    // Get student data
    const { data: siswa } = await supabase
      .from("siswa")
      .select(`
        *,
        kelas:kelas_id(nama_kelas, tingkatan:tingkatan_id(nama_tingkatan))
      `)
      .eq("id", siswaId)
      .single()

    if (!siswa) {
      return NextResponse.json({ error: "Siswa not found" }, { status: 404 })
    }

    const [{ data: nilaiUjian }, { data: nilaiHafalan }, { data: kehadiran }, { data: penilaianSikap }] =
      await Promise.all([
        supabase
          .from("nilai_ujian")
          .select(`
          *,
          mata_pelajaran:mata_pelajaran_id(nama, kode)
        `)
          .eq("siswa_id", siswaId)
          .eq("periode_ajaran_id", periodeAjaranId)
          .eq("semester", semester),

        supabase
          .from("nilai_hafalan")
          .select(`
          *,
          mata_pelajaran:mata_pelajaran_id(nama, kode)
        `)
          .eq("siswa_id", siswaId)
          .eq("periode_ajaran_id", periodeAjaranId)
          .eq("semester", semester),

        supabase
          .from("kehadiran")
          .select("*")
          .eq("siswa_id", siswaId)
          .eq("periode_ajaran_id", periodeAjaranId)
          .eq("semester", semester),

        supabase
          .from("penilaian_sikap")
          .select("*")
          .eq("siswa_id", siswaId)
          .eq("periode_ajaran_id", periodeAjaranId)
          .eq("semester", semester),
      ])

    // Calculate totals
    const totalHadir = kehadiran?.filter((k) => k.status === "HADIR").length || 0
    const totalSakit = kehadiran?.filter((k) => k.status === "SAKIT").length || 0
    const totalIzin = kehadiran?.filter((k) => k.status === "IZIN").length || 0
    const totalAlpa = kehadiran?.filter((k) => k.status === "ALPA").length || 0

    const rapotData = {
      siswa,
      nilaiUjian: nilaiUjian || [],
      nilaiHafalan: nilaiHafalan || [],
      kehadiran: {
        hadir: totalHadir,
        sakit: totalSakit,
        izin: totalIzin,
        alpa: totalAlpa,
      },
      penilaianSikap: penilaianSikap || [],
      semester,
      periodeAjaran: periodeAjaranId,
    }

    const { error: upsertError } = await supabase.from("ringkasan_rapot").upsert({
      siswa_id: siswaId,
      periode_ajaran_id: periodeAjaranId,
      semester: semester,
      data_rapot: rapotData,
      updated_at: new Date().toISOString(),
    })

    if (upsertError) {
      console.error("Error caching rapot:", upsertError)
    }

    return NextResponse.json({ rapot: rapotData, cached: false })
  } catch (error) {
    console.error("Generate rapot error:", error)
    return NextResponse.json({ error: "Failed to generate rapot" }, { status: 500 })
  }
}
