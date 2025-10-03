import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMataPelajaranDuplicates() {
  console.log('🔍 Checking for duplicate mata pelajaran...\n')

  const allMapel = await prisma.mataPelajaran.findMany({
    select: { id: true, nama_mapel: true, jenis: true }
  })

  const grouped = allMapel.reduce((acc, mp) => {
    const key = `${mp.nama_mapel}|${mp.jenis}`
    if (!acc[key]) acc[key] = []
    acc[key].push(mp)
    return acc
  }, {} as Record<string, typeof allMapel>)

  console.log('📋 Mata Pelajaran Analysis:')

  Object.entries(grouped).forEach(([key, mapels]) => {
    const [nama, jenis] = key.split('|')
    if (mapels.length > 1) {
      console.log(`\n❌ DUPLICATE: ${nama} (${jenis}) - ${mapels.length} entries:`)
      mapels.forEach(mp => {
        console.log(`   ID: ${mp.id}`)
      })
    } else {
      console.log(`✅ UNIQUE: ${nama} (${jenis}) - ID: ${mapels[0].id}`)
    }
  })

  // Check which ones are used in nilaiHafalan
  console.log('\n🔍 Checking nilaiHafalan usage for student 17:')

  const nilaiHafalan = await prisma.nilaiHafalan.findMany({
    where: { siswa_id: 17 },
    include: { mata_pelajaran: true }
  })

  nilaiHafalan.forEach(nh => {
    console.log(`nilaiHafalan: ${nh.mata_pelajaran.nama_mapel} (${nh.mata_pelajaran.jenis}) - Mapel ID: ${nh.mata_pelajaran.id}`)
  })

  await prisma.$disconnect()
}

checkMataPelajaranDuplicates()