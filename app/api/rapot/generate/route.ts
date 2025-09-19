import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)
    const { siswaId, periodeAjaranId, semester } = await request.json()

    // Get student data
    const { data: siswa } = await supabase
      .from("siswa")
      .select(`
        *,
        kelas:kelas_id(nama, tingkatan:tingkatan_id(nama))
      `)
      .eq("id", siswaId)
      .single()

    if (!siswa) {
      return NextResponse.json({ error: "Siswa not found" }, { status: 404 })
    }

    // Get exam scores
    const { data: nilaiUjian } = await supabase
      .from("nilai_ujian")
      .select(`
        *,
        mata_pelajaran:mata_pelajaran_id(nama, kode)
      `)
      .eq("siswa_id", siswaId)
      .eq("periode_ajaran_id", periodeAjaranId)
      .eq("semester", semester)

    // Get memorization scores
    const { data: nilaiHafalan } = await supabase
      .from("nilai_hafalan")
      .select(`
        *,
        mata_pelajaran:mata_pelajaran_id(nama, kode)
      `)
      .eq("siswa_id", siswaId)
      .eq("periode_ajaran_id", periodeAjaranId)
      .eq("semester", semester)

    // Get attendance
    const { data: kehadiran } = await supabase
      .from("kehadiran")
      .select("*")
      .eq("siswa_id", siswaId)
      .eq("periode_ajaran_id", periodeAjaranId)
      .eq("semester", semester)

    // Get behavior assessment
    const { data: penilaianSikap } = await supabase
      .from("penilaian_sikap")
      .select("*")
      .eq("siswa_id", siswaId)
      .eq("periode_ajaran_id", periodeAjaranId)
      .eq("semester", semester)

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

    return NextResponse.json({ rapot: rapotData })
  } catch (error) {
    console.error("Generate rapot error:", error)
    return NextResponse.json({ error: "Failed to generate rapot" }, { status: 500 })
  }
}
