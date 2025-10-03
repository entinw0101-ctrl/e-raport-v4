import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixNilaiHafalanIds() {
  console.log('🔧 Fixing nilaiHafalan mata_pelajaran IDs...\n')

  try {
    // Map of wrong ID -> correct ID
    const idMapping: Record<number, number> = {
      31: 4,  // Bahasa Arab (Hafalan) 31 -> 4
      37: 35  // Nahwu (Hafalan) 37 -> 35
    }

    console.log('📋 ID Mapping:')
    Object.entries(idMapping).forEach(([wrong, correct]) => {
      console.log(`   ${wrong} -> ${correct}`)
    })
    console.log()

    // Update nilaiHafalan records
    for (const [wrongId, correctId] of Object.entries(idMapping)) {
      const result = await prisma.nilaiHafalan.updateMany({
        where: {
          mapel_id: parseInt(wrongId)
        },
        data: {
          mapel_id: correctId
        }
      })

      if (result.count > 0) {
        console.log(`✅ Updated ${result.count} nilaiHafalan records: ${wrongId} -> ${correctId}`)
      }
    }

    // Verify the fix
    console.log('\n🔍 Verification:')
    for (const correctId of Object.values(idMapping)) {
      const count = await prisma.nilaiHafalan.count({
        where: { mapel_id: correctId }
      })
      console.log(`   nilaiHafalan with mapel_id ${correctId}: ${count} records`)
    }

    // Check if any still use wrong IDs
    const wrongIds = Object.keys(idMapping).map(id => parseInt(id))
    const remainingWrong = await prisma.nilaiHafalan.findMany({
      where: {
        mapel_id: { in: wrongIds }
      }
    })

    if (remainingWrong.length > 0) {
      console.log(`\n❌ Still ${remainingWrong.length} records using wrong IDs`)
    } else {
      console.log('\n✅ All nilaiHafalan records now use correct mata_pelajaran IDs')
    }

  } catch (error) {
    console.error('❌ Error fixing nilaiHafalan IDs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Jalankan fix
fixNilaiHafalanIds()