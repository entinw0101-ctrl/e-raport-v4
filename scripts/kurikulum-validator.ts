import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    totalKurikulum: number
    totalMataPelajaran: number
    totalTingkatan: number
    issuesFound: number
  }
}

export async function validateKurikulumIntegrity(): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // 1. Basic counts
    const [totalKurikulum, totalMataPelajaran, totalTingkatan] = await Promise.all([
      prisma.kurikulum.count(),
      prisma.mataPelajaran.count(),
      prisma.tingkatan.count()
    ])

    // 2. Check for mata pelajaran without kurikulum
    const mapelWithoutKurikulum = await prisma.mataPelajaran.findMany({
      where: {
        kurikulum: { none: {} }
      },
      select: {
        id: true,
        nama_mapel: true,
        jenis: true
      }
    })

    if (mapelWithoutKurikulum.length > 0) {
      errors.push(`❌ ${mapelWithoutKurikulum.length} mata pelajaran tanpa kurikulum:`)
      mapelWithoutKurikulum.forEach(mp => {
        errors.push(`   - ${mp.nama_mapel} (${mp.jenis}) - ID: ${mp.id}`)
      })
    }

    // 3. Check for kurikulum with invalid references
    const kurikulumWithInvalidMapel = await prisma.kurikulum.findMany({
      where: {
        mata_pelajaran: null
      },
      select: {
        id: true,
        mapel_id: true
      }
    })

    if (kurikulumWithInvalidMapel.length > 0) {
      errors.push(`❌ ${kurikulumWithInvalidMapel.length} kurikulum dengan referensi mata pelajaran invalid`)
    }

    const kurikulumWithInvalidKitab = await prisma.kurikulum.findMany({
      where: {
        kitab: null,
        kitab_id: { not: null }
      },
      select: {
        id: true,
        kitab_id: true
      }
    })

    if (kurikulumWithInvalidKitab.length > 0) {
      errors.push(`❌ ${kurikulumWithInvalidKitab.length} kurikulum dengan referensi kitab invalid`)
    }

    // 4. Check for duplicate kurikulum (same mapel + tingkatan)
    const duplicateKurikulum = await prisma.$queryRaw`
      SELECT mapel_id, tingkatan_id, COUNT(*) as count
      FROM kurikulum
      GROUP BY mapel_id, tingkatan_id
      HAVING COUNT(*) > 1
    ` as any[]

    if (duplicateKurikulum.length > 0) {
      warnings.push(`⚠️ ${duplicateKurikulum.length} duplikasi kurikulum ditemukan`)
    }

    // 5. Check for mata pelajaran with same name but different jenis
    const allMapel = await prisma.mataPelajaran.findMany({
      select: { nama_mapel: true }
    })

    const nameCounts = allMapel.reduce((acc, mp) => {
      acc[mp.nama_mapel] = (acc[mp.nama_mapel] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const duplicateNames = Object.keys(nameCounts).filter(name => nameCounts[name] > 1)

    const mapelWithMultipleJenis = await prisma.mataPelajaran.findMany({
      where: {
        nama_mapel: {
          in: duplicateNames
        }
      },
      select: {
        nama_mapel: true,
        jenis: true
      },
      orderBy: [
        { nama_mapel: 'asc' },
        { jenis: 'asc' }
      ]
    })

    // Group by name to check jenis distribution
    const groupedByName = mapelWithMultipleJenis.reduce((acc, mp) => {
      if (!acc[mp.nama_mapel]) acc[mp.nama_mapel] = []
      acc[mp.nama_mapel].push(mp.jenis)
      return acc
    }, {} as Record<string, string[]>)

    for (const [nama, jenisList] of Object.entries(groupedByName)) {
      if (jenisList.length > 1) {
        const hasUjian = jenisList.includes('Ujian')
        const hasHafalan = jenisList.includes('Hafalan')

        if (hasUjian && hasHafalan) {
          // This is expected - check if both have kurikulum
          const ujianMapel = await prisma.mataPelajaran.findFirst({
            where: { nama_mapel: nama, jenis: 'Ujian' }
          })
          const hafalanMapel = await prisma.mataPelajaran.findFirst({
            where: { nama_mapel: nama, jenis: 'Hafalan' }
          })

          if (ujianMapel && hafalanMapel) {
            const ujianKurikulumCount = await prisma.kurikulum.count({
              where: { mapel_id: ujianMapel.id }
            })
            const hafalanKurikulumCount = await prisma.kurikulum.count({
              where: { mapel_id: hafalanMapel.id }
            })

            if (ujianKurikulumCount > 0 && hafalanKurikulumCount === 0) {
              warnings.push(`⚠️ ${nama}: Ujian memiliki kurikulum (${ujianKurikulumCount}), Hafalan tidak memiliki (${hafalanKurikulumCount})`)
            }
          }
        }
      }
    }

    // 6. Check for orphaned kurikulum (tingkatan doesn't exist)
    const allTingkatanIds = await prisma.tingkatan.findMany({
      select: { id: true }
    })
    const validTingkatanIds = allTingkatanIds.map(t => t.id)

    const kurikulumWithInvalidTingkatan = await prisma.kurikulum.findMany({
      where: {
        tingkatan_id: {
          notIn: validTingkatanIds
        }
      },
      select: {
        id: true,
        tingkatan_id: true
      }
    })

    if (kurikulumWithInvalidTingkatan.length > 0) {
      errors.push(`❌ ${kurikulumWithInvalidTingkatan.length} kurikulum dengan tingkatan invalid`)
    }

    const issuesFound = errors.length + warnings.length

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalKurikulum,
        totalMataPelajaran,
        totalTingkatan,
        issuesFound
      }
    }

  } catch (error) {
    return {
      isValid: false,
      errors: [`❌ Error during validation: ${error}`],
      warnings: [],
      summary: {
        totalKurikulum: 0,
        totalMataPelajaran: 0,
        totalTingkatan: 0,
        issuesFound: 1
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

// CLI runner
if (require.main === module) {
  validateKurikulumIntegrity().then(result => {
    console.log('🔍 Validasi Integritas Kurikulum\n')

    console.log(`📊 Ringkasan:`)
    console.log(`   - Total Kurikulum: ${result.summary.totalKurikulum}`)
    console.log(`   - Total Mata Pelajaran: ${result.summary.totalMataPelajaran}`)
    console.log(`   - Total Tingkatan: ${result.summary.totalTingkatan}`)
    console.log(`   - Issues Ditemukan: ${result.summary.issuesFound}\n`)

    if (result.errors.length > 0) {
      console.log('❌ ERRORS:')
      result.errors.forEach(error => console.log(`   ${error}`))
      console.log()
    }

    if (result.warnings.length > 0) {
      console.log('⚠️  WARNINGS:')
      result.warnings.forEach(warning => console.log(`   ${warning}`))
      console.log()
    }

    if (result.isValid) {
      console.log('✅ Validasi BERHASIL - Tidak ada masalah kritis')
    } else {
      console.log('❌ Validasi GAGAL - Perlu perbaikan segera')
      process.exit(1)
    }
  })
}