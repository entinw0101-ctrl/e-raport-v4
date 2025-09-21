import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
   try {
     const body = await request.json()
     const { tahun_ajaran_id, tingkatan_asal_id, preview } = body

     if (preview) {
       // Handle preview request
       if (!tahun_ajaran_id || !tingkatan_asal_id) {
         return NextResponse.json(
           {
             success: false,
             error: "Tahun ajaran dan tingkatan asal harus diisi",
           },
           { status: 400 },
         )
       }

       // Get all periods in this academic year
       const periodeAjaran = await prisma.periodeAjaran.findMany({
         where: {
           master_tahun_ajaran_id: Number(tahun_ajaran_id),
         },
         select: { id: true },
       })

       const periodeIds = periodeAjaran.map(p => p.id)

       // Get students from classes in the source tingkatan with their grades across all periods
       const siswaData = await prisma.siswa.findMany({
         where: {
           kelas: {
             tingkatan_id: Number(tingkatan_asal_id),
           },
           status: "Aktif",
           master_tahun_ajaran_id: Number(tahun_ajaran_id),
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
           nilai_hafalan: {
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

       // Calculate average grades and determine promotion status
       const siswa = siswaData.map((siswaItem) => {
         const ujianGrades = siswaItem.nilai_ujian.map(n => Number(n.nilai_angka))
         const hafalanGrades = siswaItem.nilai_hafalan.map(n => n.predikat === "TERCAPAI" ? 100 : 0)

         const allGrades = [...ujianGrades, ...hafalanGrades]
         const rata_rata = allGrades.length > 0 ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length : 0

         // Simple promotion logic: >75 naik, 60-75 tinggal, <60 tinggal
         let status: "naik" | "lulus" | "tinggal" = "tinggal"
         let kelas_tujuan = siswaItem.kelas?.nama_kelas || ""

         if (rata_rata >= 75) {
           status = "naik"
           // For now, just keep same class name (this would need more complex logic)
         } else if (rata_rata >= 60) {
           status = "tinggal"
         }

         return {
           id: siswaItem.id.toString(),
           siswa_id: siswaItem.id.toString(),
           nama: siswaItem.nama || "",
           nis: siswaItem.nis,
           kelas_asal: siswaItem.kelas?.nama_kelas || "",
           kelas_tujuan,
           status,
           rata_rata: Math.round(rata_rata * 100) / 100,
         }
       })

       // Get tingkatan mapping for promotion based on urutan
       const sourceTingkatan = await prisma.tingkatan.findUnique({
         where: { id: Number(tingkatan_asal_id) },
       })

       if (!sourceTingkatan) {
         return NextResponse.json(
           { success: false, error: "Tingkatan asal tidak ditemukan" },
           { status: 400 }
         )
       }

       // Get next tingkatan based on sequential urutan
       const nextTingkatan = sourceTingkatan.urutan !== null ? await prisma.tingkatan.findFirst({
         where: {
           urutan: sourceTingkatan.urutan + 1,
         },
       }) : null

       const kelasMapping = [
         {
           tingkatan_asal_id: tingkatan_asal_id,
           tingkatan_tujuan_id: nextTingkatan?.id || null,
           tingkatan_asal_nama: sourceTingkatan.nama_tingkatan,
           tingkatan_tujuan_nama: nextTingkatan?.nama_tingkatan || "Lulus",
         },
       ]

       return NextResponse.json({
         success: true,
         siswa,
         kelasMapping,
       })
     }

     // Handle execution - promote students to next tingkatan
     if (!tahun_ajaran_id || !tingkatan_asal_id) {
       return NextResponse.json(
         {
           success: false,
           error: "Tahun ajaran dan tingkatan asal harus diisi",
         },
         { status: 400 },
       )
     }

     // Get current tingkatan with urutan
     const currentTingkatan = await prisma.tingkatan.findUnique({
       where: { id: Number(tingkatan_asal_id) },
     })

     if (!currentTingkatan) {
       return NextResponse.json(
         { success: false, error: "Tingkatan asal tidak ditemukan" },
         { status: 400 }
       )
     }

     // Get next tingkatan based on urutan
     const nextTingkatan = currentTingkatan.urutan !== null ? await prisma.tingkatan.findFirst({
       where: {
         urutan: currentTingkatan.urutan + 1, // Next sequential grade
       },
     }) : null

     if (!nextTingkatan) {
       // This is graduation - students graduate
       const graduationResult = await prisma.siswa.updateMany({
         where: {
           kelas: {
             tingkatan_id: Number(tingkatan_asal_id),
           },
           status: "Aktif",
           master_tahun_ajaran_id: Number(tahun_ajaran_id),
         },
         data: {
           status: "Lulus",
         },
       })

       // Log the graduation
       await prisma.logPromosi.create({
         data: {
           catatan: `Graduation: ${graduationResult.count} students graduated from ${currentTingkatan?.nama_tingkatan}`,
         },
       })

       return NextResponse.json({
         success: true,
         message: `${graduationResult.count} siswa berhasil diluluskan`,
       })
     }

     // Get all classes in the next tingkatan with current student counts
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

     // Get students to promote, grouped by their current class
     const studentsByClass = await prisma.siswa.findMany({
       where: {
         kelas: {
           tingkatan_id: Number(tingkatan_asal_id),
         },
         status: "Aktif",
         master_tahun_ajaran_id: Number(tahun_ajaran_id),
       },
       include: {
         kelas: true,
       },
       orderBy: [
         { kelas: { nama_kelas: "asc" } },
         { nama: "asc" }
       ],
     })

     // Intelligent distribution: maintain class balance
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

       // Update student to new class
       await prisma.siswa.update({
         where: { id: student.id },
         data: {
           kelas_id: targetClass.id,
         },
       })

       // Create history record
       await prisma.riwayatKelasSiswa.create({
         data: {
           siswa_id: student.id,
           kelas_id: targetClass.id,
           master_tahun_ajaran_id: Number(tahun_ajaran_id),
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
         catatan: `Promotion: ${promotionResults.length} students promoted from ${currentTingkatan?.nama_tingkatan} to ${nextTingkatan.nama_tingkatan}`,
       },
     })

     return NextResponse.json({
       success: true,
       message: `${promotionResults.length} siswa berhasil dipromosikan ke ${nextTingkatan.nama_tingkatan}`,
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

    // Get promotion preview data
    const tingkatanData = await prisma.tingkatan.findMany({
      orderBy: { urutan: "asc" },
      include: {
        kelas: {
          include: {
            _count: {
              select: { siswa: true }
            }
          }
        }
      }
    })

    // Get current active students count by tingkatan and kelas
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

    // Process data for promotion preview
    const promosiPreview = tingkatanData.map((tingkatan) => {
      const siswaCountTingkatan = siswaCount.filter((s) => s.master_tahun_ajaran_id === tingkatan.id).length

      return {
        ...tingkatan,
        jumlah_siswa: siswaCountTingkatan,
        kelas: tingkatan.kelas?.map((kelas) => ({
          ...kelas,
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
