import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeKurikulumData() {
  console.log('🔍 Menganalisis Data Kurikulum...\n')

  try {
    // 1. Hitung total data
    const [totalKurikulum, totalMataPelajaran, totalTingkatan] = await Promise.all([
      prisma.kurikulum.count(),
      prisma.mataPelajaran.count(),
      prisma.tingkatan.count()
    ])

    console.log(`📊 Total Data:`)
    console.log(`   - Kurikulum: ${totalKurikulum}`)
    console.log(`   - Mata Pelajaran: ${totalMataPelajaran}`)
    console.log(`   - Tingkatan: ${totalTingkatan}\n`)

    // 2. Analisis distribusi mata pelajaran per jenis
    const mataPelajaranByJenis = await prisma.mataPelajaran.groupBy({
      by: ['jenis'],
      _count: { id: true }
    })

    console.log(`📚 Distribusi Mata Pelajaran per Jenis:`)
    mataPelajaranByJenis.forEach(item => {
      console.log(`   - ${item.jenis}: ${item._count.id} mata pelajaran`)
    })
    console.log()

    // 3. Analisis kurikulum per tingkatan
    const kurikulumByTingkatan = await prisma.kurikulum.groupBy({
      by: ['tingkatan_id'],
      _count: { id: true }
    })

    console.log(`🏫 Kurikulum per Tingkatan:`)
    for (const item of kurikulumByTingkatan) {
      const tingkatan = await prisma.tingkatan.findUnique({
        where: { id: item.tingkatan_id },
        select: { nama_tingkatan: true }
      })
      console.log(`   - Tingkatan ${tingkatan?.nama_tingkatan} (ID: ${item.tingkatan_id}): ${item._count.id} kurikulum`)
    }
    console.log()

    // 4. DETEKSI MASALAH: Mata pelajaran tanpa kurikulum
    console.log(`⚠️  DETEKSI MASALAH:\n`)

    // 4a. Mata pelajaran Ujian tanpa kurikulum
    const mapelUjianTanpaKurikulum = await prisma.mataPelajaran.findMany({
      where: {
        jenis: 'Ujian',
        kurikulum: {
          none: {}
        }
      },
      select: {
        id: true,
        nama_mapel: true,
        jenis: true
      }
    })

    if (mapelUjianTanpaKurikulum.length > 0) {
      console.log(`❌ Mata Pelajaran Ujian tanpa Kurikulum:`)
      mapelUjianTanpaKurikulum.forEach(mp => {
        console.log(`   - ${mp.nama_mapel} (${mp.jenis}) - ID: ${mp.id}`)
      })
    } else {
      console.log(`✅ Semua Mata Pelajaran Ujian memiliki kurikulum`)
    }

    // 4b. Mata pelajaran Hafalan tanpa kurikulum
    const mapelHafalanTanpaKurikulum = await prisma.mataPelajaran.findMany({
      where: {
        jenis: 'Hafalan',
        kurikulum: {
          none: {}
        }
      },
      select: {
        id: true,
        nama_mapel: true,
        jenis: true
      }
    })

    if (mapelHafalanTanpaKurikulum.length > 0) {
      console.log(`❌ Mata Pelajaran Hafalan tanpa Kurikulum:`)
      mapelHafalanTanpaKurikulum.forEach(mp => {
        console.log(`   - ${mp.nama_mapel} (${mp.jenis}) - ID: ${mp.id}`)
      })
    } else {
      console.log(`✅ Semua Mata Pelajaran Hafalan memiliki kurikulum`)
    }

    // 5. Analisis detail kurikulum untuk tingkatan tertentu (contoh)
    console.log(`\n🔍 Analisis Detail untuk Tingkatan dengan Data:`)

    const sampleTingkatan = await prisma.tingkatan.findFirst({
      include: {
        kurikulum: {
          include: {
            mata_pelajaran: true,
            kitab: true
          }
        }
      }
    })

    if (sampleTingkatan) {
      console.log(`\nContoh Tingkatan: ${sampleTingkatan.nama_tingkatan} (ID: ${sampleTingkatan.id})`)
      console.log(`Kurikulum (${sampleTingkatan.kurikulum.length} entries):`)

      const groupedByJenis = sampleTingkatan.kurikulum.reduce((acc, k) => {
        const jenis = k.mata_pelajaran?.jenis || 'Unknown'
        if (!acc[jenis]) acc[jenis] = []
        acc[jenis].push(k)
        return acc
      }, {} as Record<string, typeof sampleTingkatan.kurikulum>)

      Object.entries(groupedByJenis).forEach(([jenis, kurikulums]) => {
        console.log(`   ${jenis}:`)
        kurikulums.forEach(k => {
          console.log(`     - ${k.mata_pelajaran?.nama_mapel} -> ${k.kitab?.nama_kitab || 'No kitab'}`)
        })
      })
    }

    // 6. Rekomendasi perbaikan
    console.log(`\n💡 REKOMENDASI PERBAIKAN:`)

    if (mapelHafalanTanpaKurikulum.length > 0) {
      console.log(`1. Tambahkan kurikulum untuk mata pelajaran Hafalan yang missing:`)
      mapelHafalanTanpaKurikulum.forEach(mp => {
        console.log(`   - ${mp.nama_mapel} (${mp.jenis})`)
      })
    }

    if (mapelUjianTanpaKurikulum.length > 0) {
      console.log(`2. Tambahkan kurikulum untuk mata pelajaran Ujian yang missing:`)
      mapelUjianTanpaKurikulum.forEach(mp => {
        console.log(`   - ${mp.nama_mapel} (${mp.jenis})`)
      })
    }

    console.log(`3. Pastikan setiap tingkatan memiliki kurikulum untuk semua mata pelajaran yang diperlukan`)

  } catch (error) {
    console.error('❌ Error analyzing kurikulum data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Jalankan analisis
analyzeKurikulumData()
