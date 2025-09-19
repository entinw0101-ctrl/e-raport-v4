import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    const { tahun_ajaran_lama, tahun_ajaran_baru, tingkatan_promosi } = await request.json()

    if (!tahun_ajaran_lama || !tahun_ajaran_baru) {
      return NextResponse.json(
        {
          success: false,
          error: "Tahun ajaran lama dan baru harus diisi",
        },
        { status: 400 },
      )
    }

    // Start transaction-like operations
    const results = []

    for (const promosi of tingkatan_promosi) {
      const { tingkatan_asal_id, tingkatan_tujuan_id, kelas_mapping } = promosi

      if (tingkatan_tujuan_id === null) {
        // Handle graduation - update siswa status to lulus
        const { data: siswaLulus, error: errorLulus } = await supabase
          .from("siswa")
          .update({
            status: "lulus",
            tahun_lulus: new Date().getFullYear(),
          })
          .eq("tingkatan_id", tingkatan_asal_id)
          .eq("status", "aktif")
          .select()

        if (errorLulus) {
          throw new Error(`Error updating graduated students: ${errorLulus.message}`)
        }

        results.push({
          type: "graduation",
          tingkatan_asal_id,
          count: siswaLulus?.length || 0,
        })
      } else {
        // Handle promotion to next level
        for (const mapping of kelas_mapping) {
          const { kelas_asal_id, kelas_tujuan_id } = mapping

          // Get students from source class
          const { data: siswaPromosi, error: errorGetSiswa } = await supabase
            .from("siswa")
            .select("id")
            .eq("kelas_id", kelas_asal_id)
            .eq("status", "aktif")

          if (errorGetSiswa) {
            throw new Error(`Error getting students: ${errorGetSiswa.message}`)
          }

          if (siswaPromosi && siswaPromosi.length > 0) {
            // Update students to new class and tingkatan
            const { data: updatedSiswa, error: errorUpdate } = await supabase
              .from("siswa")
              .update({
                kelas_id: kelas_tujuan_id,
                tingkatan_id: tingkatan_tujuan_id,
                tahun_ajaran_saat_ini: tahun_ajaran_baru,
              })
              .in(
                "id",
                siswaPromosi.map((s) => s.id),
              )
              .select()

            if (errorUpdate) {
              throw new Error(`Error updating students: ${errorUpdate.message}`)
            }

            results.push({
              type: "promotion",
              kelas_asal_id,
              kelas_tujuan_id,
              count: updatedSiswa?.length || 0,
            })
          }
        }
      }
    }

    // Log the promotion activity
    const { error: logError } = await supabase.from("log_promosi_kelas").insert({
      tahun_ajaran_lama,
      tahun_ajaran_baru,
      detail_promosi: results,
      created_at: new Date().toISOString(),
    })

    if (logError) {
      console.error("Error logging promotion:", logError)
    }

    return NextResponse.json({
      success: true,
      message: "Promosi kelas berhasil dilakukan",
      data: results,
    })
  } catch (error) {
    console.error("Error in class promotion:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Terjadi kesalahan saat promosi kelas",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    const { searchParams } = new URL(request.url)
    const tahun_ajaran = searchParams.get("tahun_ajaran")

    // Get promotion preview data
    const { data: tingkatanData, error: tingkatanError } = await supabase
      .from("tingkatan")
      .select(`
        id,
        nama_tingkatan,
        urutan,
        kelas (
          id,
          nama_kelas,
          _count: siswa(count)
        )
      `)
      .order("urutan")

    if (tingkatanError) {
      throw new Error(tingkatanError.message)
    }

    // Get current active students count by tingkatan
    const { data: siswaCount, error: siswaError } = await supabase
      .from("siswa")
      .select("tingkatan_id, kelas_id")
      .eq("status", "aktif")
      .eq("tahun_ajaran_saat_ini", tahun_ajaran || new Date().getFullYear().toString())

    if (siswaError) {
      throw new Error(siswaError.message)
    }

    // Process data for promotion preview
    const promosiPreview = tingkatanData?.map((tingkatan) => {
      const siswaCount_tingkatan = siswaCount?.filter((s) => s.tingkatan_id === tingkatan.id).length || 0

      return {
        ...tingkatan,
        jumlah_siswa: siswaCount_tingkatan,
        kelas: tingkatan.kelas?.map((kelas) => ({
          ...kelas,
          jumlah_siswa: siswaCount?.filter((s) => s.kelas_id === kelas.id).length || 0,
        })),
      }
    })

    return NextResponse.json({
      success: true,
      data: promosiPreview,
    })
  } catch (error) {
    console.error("Error getting promotion preview:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Terjadi kesalahan saat mengambil data promosi",
      },
      { status: 500 },
    )
  }
}
