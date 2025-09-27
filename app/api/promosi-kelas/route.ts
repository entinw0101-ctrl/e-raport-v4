import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
   try {
     const body = await request.json()
     const { master_tahun_ajaran_lama_id, master_tahun_ajaran_baru_id, kelas_asal_ids, preview } = body

     if (preview) {
       // Handle preview request - based on selected classes
       if (!master_tahun_ajaran_lama_id || !kelas_asal_ids || kelas_asal_ids.length === 0) {
         return NextResponse.json(
           {
             success: false,
             error: "Master tahun ajaran lama dan kelas asal harus diisi",
           },
           { status: 400 },
         )
       }

       // Get all periods in the old academic year for grade calculation
       const periodeAjaranLama = await prisma.periodeAjaran.findMany({
         where: {
           master_tahun_ajaran_id: Number(master_tahun_ajaran_lama_id),
         },
         select: { id: true },
       })

       const periodeIds = periodeAjaranLama.map(p => p.id)

       // Get students from selected classes
       const siswaData = await prisma.siswa.findMany({
         where: {
           kelas_id: { in: kelas_asal_ids.map((id: any) => Number(id)) },
           status: "Aktif",
           master_tahun_ajaran_id: Number(master_tahun_ajaran_lama_id),
         },
         include: {
           kelas: {
             include: {
               tingkatan: true,
             },
           },
           nilai_ujian: {
             where: {
               periode_ajaran_id: {
                 in: periodeIds,
               },
             },
             include: {
               mata_pelajaran: true,
             },
           },
         },
       })

       // Get source classes info
       const sourceClasses = await prisma.kelas.findMany({
         where: { id: { in: kelas_asal_ids.map((id: any) => Number(id)) } },
         include: { tingkatan: true }
       })

       if (!sourceClasses || sourceClasses.length === 0) {
         return NextResponse.json(
           { success: false, error: "Kelas asal tidak ditemukan" },
           { status: 400 }
         )
       }

       // Calculate average grades (exam scores only) and determine promotion status
       const siswa = siswaData.map((siswaItem) => {
         // Only calculate exam grades - hafalan is not numerical
         const ujianGrades = siswaItem.nilai_ujian.map(n => Number(n.nilai_angka))
         const rata_rata = ujianGrades.length > 0 ? ujianGrades.reduce((a, b) => a + b, 0) / ujianGrades.length : 0

         // ALL students promote - no grade validation
         const status: "naik" = "naik"

         return {
           id: siswaItem.id.toString(),
           siswa_id: siswaItem.id.toString(),
           nama: siswaItem.nama || "",
           nis: siswaItem.nis,
           kelas_asal: siswaItem.kelas?.nama_kelas || "",
           kelas_tujuan: siswaItem.kelas?.nama_kelas || "", // Will be updated during actual promotion
           status,
           rata_rata: Math.round(rata_rata * 100) / 100,
         }
       })

       // Get next tingkatan for mapping (assume all classes are from same tingkatan)
       const sourceTingkatan = sourceClasses[0].tingkatan

       if (!sourceTingkatan) {
         return NextResponse.json(
           { success: false, error: "Tingkatan kelas asal tidak ditemukan" },
           { status: 400 }
         )
       }

       const nextTingkatan = sourceTingkatan.urutan !== null ? await prisma.tingkatan.findFirst({
         where: {
           urutan: sourceTingkatan.urutan + 1,
         },
       }) : null

       const kelasMapping = [
         {
           kelas_asal_ids: kelas_asal_ids,
           tingkatan_asal_nama: sourceTingkatan?.nama_tingkatan || "",
           tingkatan_tujuan_nama: nextTingkatan?.nama_tingkatan || "Lulus",
         },
       ]

       return NextResponse.json({
         success: true,
         siswa,
         kelasMapping,
       })
     }

     // Handle execution - promote students from selected classes to next tingkatan/year
     if (!master_tahun_ajaran_lama_id || !master_tahun_ajaran_baru_id || !kelas_asal_ids || kelas_asal_ids.length === 0) {
       return NextResponse.json(
         {
           success: false,
           error: "Master tahun ajaran lama, baru, dan kelas asal harus diisi",
         },
         { status: 400 },
       )
     }

     // Get source classes info
     const sourceClasses = await prisma.kelas.findMany({
       where: { id: { in: kelas_asal_ids.map((id: any) => Number(id)) } },
       include: { tingkatan: true }
     })

     if (!sourceClasses || sourceClasses.length === 0) {
       return NextResponse.json(
         { success: false, error: "Kelas asal tidak ditemukan" },
         { status: 400 }
       )
     }

     // Assume all classes are from same tingkatan
     const sourceTingkatan = sourceClasses[0].tingkatan

     if (!sourceTingkatan) {
       return NextResponse.json(
         { success: false, error: "Tingkatan kelas asal tidak ditemukan" },
         { status: 400 }
       )
     }

     // Get master tahun ajaran info
     const oldAcademicYear = await prisma.masterTahunAjaran.findUnique({
       where: { id: Number(master_tahun_ajaran_lama_id) }
     })

     const newAcademicYear = await prisma.masterTahunAjaran.findUnique({
       where: { id: Number(master_tahun_ajaran_baru_id) }
     })

     if (!oldAcademicYear || !newAcademicYear) {
       return NextResponse.json(
         { success: false, error: "Master tahun ajaran tidak ditemukan" },
         { status: 400 }
       )
     }

     // Get next tingkatan based on urutan
     const nextTingkatan = sourceTingkatan.urutan !== null ? await prisma.tingkatan.findFirst({
       where: {
         urutan: sourceTingkatan.urutan + 1, // Next sequential grade
       },
     }) : null

     if (!nextTingkatan) {
       // This is graduation - students from selected classes graduate
       const graduationResult = await prisma.siswa.updateMany({
         where: {
           kelas_id: { in: kelas_asal_ids.map((id: any) => Number(id)) },
           status: "Aktif",
           master_tahun_ajaran_id: Number(master_tahun_ajaran_lama_id),
         },
         data: {
           status: "Lulus",
         },
       })

       // Log the graduation
       await prisma.logPromosi.create({
         data: {
           catatan: `Graduation: ${graduationResult.count} students graduated from selected classes`,
         },
       })

       return NextResponse.json({
         success: true,
         message: `${graduationResult.count} siswa dari kelas terpilih berhasil diluluskan`,
       })
     }

     // Get all classes in the next tingkatan
     const nextClasses = await prisma.kelas.findMany({
       where: {
         tingkatan_id: nextTingkatan.id,
       },
       include: {
         _count: {
           select: { siswa: true }
         }
       },
       orderBy: { nama_kelas: "asc" },
     })

     if (nextClasses.length === 0) {
       return NextResponse.json(
         {
           success: false,
           error: `Tidak ada kelas di tingkatan ${nextTingkatan.nama_tingkatan}`,
         },
         { status: 400 },
       )
     }

     // Get students to promote from selected classes
     const studentsByClass = await prisma.siswa.findMany({
       where: {
         kelas_id: { in: kelas_asal_ids.map((id: any) => Number(id)) },
         status: "Aktif",
         master_tahun_ajaran_id: Number(master_tahun_ajaran_lama_id),
       },
       include: {
         kelas: true,
       },
       orderBy: { nama: "asc" },
     })

     // Intelligent distribution: maintain class balance and change academic year
     const promotionResults = []
     let classIndex = 0

     for (const student of studentsByClass) {
       // Find the class with the least students
       let targetClass = nextClasses[classIndex]
       let minStudents = targetClass._count.siswa

       for (let i = 0; i < nextClasses.length; i++) {
         if (nextClasses[i]._count.siswa < minStudents) {
           targetClass = nextClasses[i]
           minStudents = nextClasses[i]._count.siswa
           classIndex = i
         }
       }

       // Update student to new class and new academic year
       await prisma.siswa.update({
         where: { id: student.id },
         data: {
           kelas_id: targetClass.id,
           master_tahun_ajaran_id: Number(master_tahun_ajaran_baru_id),
         },
       })

       // Create history record
       await prisma.riwayatKelasSiswa.create({
         data: {
           siswa_id: student.id,
           kelas_id: targetClass.id,
           master_tahun_ajaran_id: Number(master_tahun_ajaran_baru_id),
         },
       })

       promotionResults.push({
         siswa_id: student.id,
         nama: student.nama,
         kelas_asal: student.kelas?.nama_kelas,
         kelas_tujuan: targetClass.nama_kelas,
       })

       // Update the count for next iteration
       targetClass._count.siswa++
     }

     // Log the promotion
     await prisma.logPromosi.create({
       data: {
         catatan: `Promotion: ${promotionResults.length} students promoted from ${sourceTingkatan?.nama_tingkatan || 'Unknown'} to ${nextTingkatan?.nama_tingkatan || 'Graduated'} and academic year from ${oldAcademicYear.nama_ajaran} to ${newAcademicYear.nama_ajaran}`,
       },
     })

     return NextResponse.json({
       success: true,
       message: `${promotionResults.length} siswa dari kelas terpilih berhasil dipromosikan ke ${nextTingkatan?.nama_tingkatan || 'lulus'}`,
       data: promotionResults,
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
    const { searchParams } = new URL(request.url)
    const tahun_ajaran = searchParams.get("tahun_ajaran")

    // Get promotion preview data - now organized by tingkatan with classes
    const tingkatanData = await prisma.tingkatan.findMany({
      orderBy: { urutan: "asc" },
      include: {
        kelas: {
          include: {
            _count: {
              select: { siswa: true }
            }
          },
          orderBy: { nama_kelas: "asc" }
        }
      }
    })

    // Get current active students count by kelas
    const siswaCount = await prisma.siswa.findMany({
      where: {
        status: "Aktif",
        master_tahun_ajaran: tahun_ajaran ? {
          nama_ajaran: tahun_ajaran
        } : undefined
      },
      select: {
        master_tahun_ajaran_id: true,
        kelas_id: true
      }
    })

    // Process data for promotion preview - organized by tingkatan with detailed class info
    const promosiPreview = tingkatanData.map((tingkatan) => {
      // Count students in this tingkatan (across all its classes)
      const siswaInTingkatan = siswaCount.filter((s) =>
        tingkatan.kelas?.some(kelas => kelas.id === s.kelas_id)
      ).length

      return {
        id: tingkatan.id,
        nama_tingkatan: tingkatan.nama_tingkatan,
        urutan: tingkatan.urutan,
        jumlah_siswa: siswaInTingkatan,
        kelas: tingkatan.kelas?.map((kelas) => ({
          id: kelas.id,
          nama_kelas: kelas.nama_kelas,
          jumlah_siswa: siswaCount.filter((s) => s.kelas_id === kelas.id).length,
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
