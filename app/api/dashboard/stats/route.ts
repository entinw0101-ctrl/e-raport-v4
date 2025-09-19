import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Get total counts
    const [siswaCount, guruCount, kelasCount, nilaiUjianCount] = await Promise.all([
      supabase.from("siswa").select("id", { count: "exact", head: true }),
      supabase.from("guru").select("id", { count: "exact", head: true }),
      supabase.from("kelas").select("id", { count: "exact", head: true }),
      supabase.from("nilai_ujian").select("id", { count: "exact", head: true }),
    ])

    // Get recent activities
    const { data: recentNilai } = await supabase
      .from("nilai_ujian")
      .select(`
        id,
        nilai,
        created_at,
        siswa:siswa_id(nama),
        mata_pelajaran:mata_pelajaran_id(nama)
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    // Get grade distribution
    const { data: gradeDistribution } = await supabase.from("nilai_ujian").select("grade")

    const gradeCounts =
      gradeDistribution?.reduce((acc: any, item) => {
        acc[item.grade] = (acc[item.grade] || 0) + 1
        return acc
      }, {}) || {}

    return NextResponse.json({
      stats: {
        totalSiswa: siswaCount.count || 0,
        totalGuru: guruCount.count || 0,
        totalKelas: kelasCount.count || 0,
        totalNilai: nilaiUjianCount.count || 0,
      },
      recentActivities: recentNilai || [],
      gradeDistribution: gradeCounts,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
