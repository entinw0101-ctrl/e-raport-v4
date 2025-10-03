import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDuplicateKurikulum() {
  console.log('🧹 Membersihkan Kurikulum Duplikat...\n')

  try {
    // 1. Temukan mata pelajaran yang memiliki nama sama tapi jenis berbeda
    const allMapel = await prisma.mataPelajaran.findMany({
      select: { id: true, nama_mapel: true, jenis: true }
    })

    const groupedByName = allMapel.reduce((acc, mp) => {
      if (!acc[mp.nama_mapel]) acc[mp.nama_mapel] = []
      acc[mp.nama_mapel].push(mp)
      return acc
    }, {} as Record<string, typeof allMapel>)

    // 2. Untuk setiap grup yang memiliki Ujian dan Hafalan
    for (const [namaMapel, mapels] of Object.entries(groupedByName)) {
      const hasUjian = mapels.find(m => m.jenis === 'Ujian')
      const hasHafalan = mapels.find(m => m.jenis === 'Hafalan')

      if (hasUjian && hasHafalan) {
        console.log(`🔍 Memproses: ${namaMapel}`)

        // 3. Untuk setiap tingkatan, cek apakah ada duplikasi kurikulum
        const tingkatanList = await prisma.tingkatan.findMany({
          select: { id: true, nama_tingkatan: true }
        })

        for (const tingkatan of tingkatanList) {
          // Cari semua kurikulum untuk tingkatan ini dan nama mapel ini
          const kurikulums = await prisma.kurikulum.findMany({
            where: {
              tingkatan_id: tingkatan.id,
              mata_pelajaran: {
                nama_mapel: namaMapel
              }
            },
            include: {
              mata_pelajaran: true,
              kitab: true
            }
          })

          if (kurikulums.length > 2) {
            console.log(`  ⚠️  Tingkatan ${tingkatan.nama_tingkatan}: ${kurikulums.length} kurikulum ditemukan`)

            // Kelompokkan berdasarkan jenis
            const byJenis = kurikulums.reduce((acc, k) => {
              const jenis = k.mata_pelajaran?.jenis || 'Unknown'
              if (!acc[jenis]) acc[jenis] = []
              acc[jenis].push(k)
              return acc
            }, {} as Record<string, typeof kurikulums>)

            // Jika ada lebih dari 1 untuk jenis yang sama, hapus yang duplikat
            for (const [jenis, items] of Object.entries(byJenis)) {
              if (items.length > 1) {
                console.log(`    🗑️  Menghapus ${items.length - 1} duplikasi untuk ${jenis}`)

                // Sort by created date, keep the oldest one
                items.sort((a, b) => a.dibuat_pada.getTime() - b.dibuat_pada.getTime())

                // Delete all except the first one
                for (let i = 1; i < items.length; i++) {
                  await prisma.kurikulum.delete({
                    where: { id: items[i].id }
                  })
                  console.log(`      ❌ Deleted kurikulum ID ${items[i].id} (${items[i].kitab?.nama_kitab || 'No kitab'})`)
                }
              }
            }
          } else if (kurikulums.length === 2) {
            // Cek apakah kitab sama (yang menandakan duplikasi)
            const kitabIds = kurikulums.map(k => k.kitab_id).filter(Boolean)
            if (kitabIds.length === 2 && kitabIds[0] === kitabIds[1]) {
              console.log(`  ⚠️  Tingkatan ${tingkatan.nama_tingkatan}: Dua kurikulum dengan kitab sama ditemukan`)

              // Cari yang Hafalan dan hapus salah satu
              const hafalanKurikulum = kurikulums.find(k => k.mata_pelajaran?.jenis === 'Hafalan')
              const ujianKurikulum = kurikulums.find(k => k.mata_pelajaran?.jenis === 'Ujian')

              if (hafalanKurikulum && ujianKurikulum) {
                // Hapus kurikulum Hafalan yang kitabnya sama dengan Ujian
                await prisma.kurikulum.delete({
                  where: { id: hafalanKurikulum.id }
                })
                console.log(`    ❌ Deleted duplicate Hafalan kurikulum ID ${hafalanKurikulum.id}`)
              }
            }
          }
        }
      }
    }

    // 4. Verifikasi cleanup
    console.log(`\n🔍 Verifikasi Cleanup:`)

    const totalKurikulumAfter = await prisma.kurikulum.count()
    console.log(`📊 Total kurikulum setelah cleanup: ${totalKurikulumAfter}`)

    // Cek masih ada duplikasi atau tidak
    const duplicateCheck = await prisma.$queryRaw`
      SELECT mapel_id, tingkatan_id, COUNT(*) as count
      FROM kurikulum
      GROUP BY mapel_id, tingkatan_id
      HAVING COUNT(*) > 1
    ` as any[]

    if (duplicateCheck.length > 0) {
      console.log(`❌ Masih ada ${duplicateCheck.length} duplikasi kurikulum`)
    } else {
      console.log(`✅ Tidak ada lagi duplikasi kurikulum`)
    }

  } catch (error) {
    console.error('❌ Error cleaning duplicate kurikulum:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Jalankan cleanup
cleanDuplicateKurikulum()