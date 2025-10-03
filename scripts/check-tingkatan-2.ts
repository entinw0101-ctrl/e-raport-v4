import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTingkatan2() {
  console.log('🔍 Mengecek Kurikulum untuk Tingkatan 2...\n')

  const kurikulums = await prisma.kurikulum.findMany({
    where: { tingkatan_id: 2 },
    include: {
      mata_pelajaran: true,
      kitab: true
    },
    orderBy: [
      { mata_pelajaran: { jenis: 'asc' } },
      { mata_pelajaran: { nama_mapel: 'asc' } }
    ]
  })

  console.log(`📚 Kurikulum Tingkatan 2 (${kurikulums.length} entries):`)

  const grouped = kurikulums.reduce((acc, k) => {
    const jenis = k.mata_pelajaran?.jenis || 'Unknown'
    if (!acc[jenis]) acc[jenis] = []
    acc[jenis].push(k)
    return acc
  }, {} as Record<string, typeof kurikulums>)

  Object.entries(grouped).forEach(([jenis, items]) => {
    console.log(`\n${jenis}:`)
    items.forEach(k => {
      console.log(`  - ${k.mata_pelajaran?.nama_mapel} -> ${k.kitab?.nama_kitab || 'No kitab'}`)
    })
  })

  // Check specifically for Bahasa Arab and Nahwu Hafalan
  console.log(`\n🔍 Checking specific subjects:`)

  const bahasaArabHafalan = await prisma.mataPelajaran.findFirst({
    where: { nama_mapel: 'Bahasa Arab', jenis: 'Hafalan' }
  })

  const nahwuHafalan = await prisma.mataPelajaran.findFirst({
    where: { nama_mapel: 'Nahwu', jenis: 'Hafalan' }
  })

  console.log(`Bahasa Arab (Hafalan) ID: ${bahasaArabHafalan?.id}`)
  console.log(`Nahwu (Hafalan) ID: ${nahwuHafalan?.id}`)

  if (bahasaArabHafalan) {
    const kurikulum = await prisma.kurikulum.findFirst({
      where: {
        mapel_id: bahasaArabHafalan.id,
        tingkatan_id: 2
      },
      include: { kitab: true }
    })
    console.log(`Bahasa Arab Hafalan kurikulum in tingkatan 2: ${kurikulum ? kurikulum.kitab?.nama_kitab : 'NOT FOUND'}`)
  }

  if (nahwuHafalan) {
    const kurikulum = await prisma.kurikulum.findFirst({
      where: {
        mapel_id: nahwuHafalan.id,
        tingkatan_id: 2
      },
      include: { kitab: true }
    })
    console.log(`Nahwu Hafalan kurikulum in tingkatan 2: ${kurikulum ? kurikulum.kitab?.nama_kitab : 'NOT FOUND'}`)
  }

  await prisma.$disconnect()
}

checkTingkatan2()