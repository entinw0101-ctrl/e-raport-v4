import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixKurikulumData() {
  console.log('🔧 Memperbaiki Data Kurikulum...\n')

  try {
    // 1. Temukan mata pelajaran Hafalan tanpa kurikulum
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

    console.log(`📋 Ditemukan ${mapelHafalanTanpaKurikulum.length} mata pelajaran Hafalan tanpa kurikulum`)

    // 2. Untuk setiap tingkatan, cek apakah ada kurikulum untuk mata pelajaran Ujian dengan nama sama
    const tingkatanList = await prisma.tingkatan.findMany({
      select: { id: true, nama_tingkatan: true }
    })

    for (const tingkatan of tingkatanList) {
      console.log(`\n🏫 Memproses Tingkatan: ${tingkatan.nama_tingkatan} (ID: ${tingkatan.id})`)

      for (const mapelHafalan of mapelHafalanTanpaKurikulum) {
        // Cari mata pelajaran Ujian dengan nama sama
        const mapelUjian = await prisma.mataPelajaran.findFirst({
          where: {
            nama_mapel: mapelHafalan.nama_mapel,
            jenis: 'Ujian'
          }
        })

        if (mapelUjian) {
          // Cek apakah sudah ada kurikulum untuk mapel Ujian di tingkatan ini
          const existingKurikulumUjian = await prisma.kurikulum.findFirst({
            where: {
              mapel_id: mapelUjian.id,
              tingkatan_id: tingkatan.id
            },
            include: { kitab: true }
          })

          if (existingKurikulumUjian) {
            // Copy kurikulum dari Ujian ke Hafalan
            const newKurikulum = await prisma.kurikulum.create({
              data: {
                mapel_id: mapelHafalan.id,
                kitab_id: existingKurikulumUjian.kitab_id,
                batas_hafalan: existingKurikulumUjian.batas_hafalan,
                tingkatan_id: tingkatan.id
              }
            })

            console.log(`   ✅ Created kurikulum for ${mapelHafalan.nama_mapel} (Hafalan) -> ${existingKurikulumUjian.kitab?.nama_kitab || 'No kitab'}`)
          } else {
            console.log(`   ⚠️  No kurikulum found for ${mapelHafalan.nama_mapel} (Ujian) in tingkatan ${tingkatan.nama_tingkatan}`)
          }
        } else {
          console.log(`   ❌ No corresponding Ujian subject found for ${mapelHafalan.nama_mapel} (Hafalan)`)
        }
      }
    }

    // 3. Verifikasi perbaikan
    console.log(`\n🔍 Verifikasi Perbaikan:`)

    const remainingIssues = await prisma.mataPelajaran.findMany({
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

    if (remainingIssues.length === 0) {
      console.log(`✅ Semua mata pelajaran Hafalan sudah memiliki kurikulum!`)
    } else {
      console.log(`❌ Masih ada ${remainingIssues.length} mata pelajaran Hafalan tanpa kurikulum:`)
      remainingIssues.forEach(mp => {
        console.log(`   - ${mp.nama_mapel} (${mp.jenis})`)
      })
    }

    // 4. Hitung total kurikulum setelah perbaikan
    const totalKurikulumAfter = await prisma.kurikulum.count()
    console.log(`\n📊 Total kurikulum setelah perbaikan: ${totalKurikulumAfter}`)

  } catch (error) {
    console.error('❌ Error fixing kurikulum data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Jalankan perbaikan
fixKurikulumData()