import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStudentTingkatan() {
  console.log('🔍 Checking student tingkatan...\n')

  // Check student with ID 17 (from the GET request we saw)
  const student = await prisma.siswa.findUnique({
    where: { id: 17 },
    include: {
      kelas: {
        include: {
          tingkatan: true
        }
      }
    }
  })

  if (student) {
    console.log(`Student: ${student.nama}`)
    console.log(`NIS: ${student.nis}`)
    console.log(`Kelas: ${student.kelas?.nama_kelas}`)
    console.log(`Tingkatan: ${student.kelas?.tingkatan?.nama_tingkatan} (ID: ${student.kelas?.tingkatan?.id})`)
  } else {
    console.log('Student not found')
  }

  await prisma.$disconnect()
}

checkStudentTingkatan()