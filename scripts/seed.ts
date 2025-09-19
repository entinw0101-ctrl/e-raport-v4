import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Mulai seeding database...")

  // Seed Master Tahun Ajaran
  const tahunAjaran = await prisma.masterTahunAjaran.create({
    data: {
      nama_ajaran: "2024/2025",
      status: "aktif",
    },
  })

  // Seed Periode Ajaran
  const periodeAjaran1 = await prisma.periodeAjaran.create({
    data: {
      nama_ajaran: "2024/2025 Semester 1",
      semester: "SATU",
      master_tahun_ajaran_id: tahunAjaran.id,
    },
  })

  const periodeAjaran2 = await prisma.periodeAjaran.create({
    data: {
      nama_ajaran: "2024/2025 Semester 2",
      semester: "DUA",
      master_tahun_ajaran_id: tahunAjaran.id,
    },
  })

  // Seed Tingkatan
  const tingkatan = await prisma.tingkatan.create({
    data: {
      nama_tingkatan: "Kelas 1 Ibtidaiyah",
      urutan: 1,
    },
  })

  // Seed Guru
  const guru = await prisma.guru.create({
    data: {
      nama: "Ustadz Ahmad Fauzi",
      nip: "123456789",
      jenis_kelamin: "LAKI_LAKI",
      tempat_lahir: "Jakarta",
      tanggal_lahir: new Date("1985-05-15"),
      telepon: "081234567890",
      alamat: "Jl. Pendidikan No. 123, Jakarta",
      status: "aktif",
    },
  })

  // Seed Kamar
  const kamar = await prisma.kamar.create({
    data: {
      nama_kamar: "Kamar Putra A1",
      kapasitas: 20,
    },
  })

  // Seed Kelas
  const kelas = await prisma.kelas.create({
    data: {
      nama_kelas: "1A",
      kapasitas: 25,
      wali_kelas_id: guru.id,
      tingkatan_id: tingkatan.id,
    },
  })

  // Seed Siswa
  const siswa1 = await prisma.siswa.create({
    data: {
      nama: "Muhammad Rizki Pratama",
      nis: "2024001",
      tempat_lahir: "Bandung",
      tanggal_lahir: new Date("2010-03-20"),
      jenis_kelamin: "LAKI_LAKI",
      agama: "Islam",
      alamat: "Jl. Masjid No. 45, Bandung",
      kelas_id: kelas.id,
      kamar_id: kamar.id,
      nama_ayah: "Budi Pratama",
      pekerjaan_ayah: "Wiraswasta",
      nama_ibu: "Siti Nurhaliza",
      pekerjaan_ibu: "Ibu Rumah Tangga",
      master_tahun_ajaran_id: tahunAjaran.id,
      status: "Aktif",
    },
  })

  const siswa2 = await prisma.siswa.create({
    data: {
      nama: "Ahmad Fadhil Rahman",
      nis: "2024002",
      tempat_lahir: "Surabaya",
      tanggal_lahir: new Date("2010-07-12"),
      jenis_kelamin: "LAKI_LAKI",
      agama: "Islam",
      alamat: "Jl. Pondok No. 78, Surabaya",
      kelas_id: kelas.id,
      kamar_id: kamar.id,
      nama_ayah: "Rahman Abdullah",
      pekerjaan_ayah: "Guru",
      nama_ibu: "Fatimah Zahra",
      pekerjaan_ibu: "Perawat",
      master_tahun_ajaran_id: tahunAjaran.id,
      status: "Aktif",
    },
  })

  // Seed Mata Pelajaran
  const mapelUjian = await prisma.mataPelajaran.create({
    data: {
      nama_mapel: "Bahasa Arab",
      jenis: "Ujian",
    },
  })

  const mapelHafalan = await prisma.mataPelajaran.create({
    data: {
      nama_mapel: "Tahfidz Al-Quran",
      jenis: "Hafalan",
    },
  })

  // Seed Kitab
  const kitab = await prisma.kitab.create({
    data: {
      nama_kitab: "Al-Quran Juz 30",
    },
  })

  // Seed Kurikulum
  await prisma.kurikulum.create({
    data: {
      mapel_id: mapelUjian.id,
      tingkatan_id: tingkatan.id,
    },
  })

  await prisma.kurikulum.create({
    data: {
      mapel_id: mapelHafalan.id,
      kitab_id: kitab.id,
      batas_hafalan: "Juz 30 (An-Nas sampai Al-Fatiha)",
      tingkatan_id: tingkatan.id,
    },
  })

  // Seed Indikator Sikap
  await prisma.indikatorSikap.create({
    data: {
      jenis_sikap: "Spiritual",
      indikator: "Rajin melaksanakan sholat berjamaah",
      is_active: true,
    },
  })

  await prisma.indikatorSikap.create({
    data: {
      jenis_sikap: "Sosial",
      indikator: "Menghormati guru dan teman",
      is_active: true,
    },
  })

  // Seed Penanggung Jawab Rapot
  await prisma.penanggungJawabRapot.create({
    data: {
      jabatan: "Kepala Pesantren",
      nama_pejabat: "KH. Abdullah Syafii",
      nip: "987654321",
      jenis_kelamin_target: "LAKI_LAKI",
      status: "aktif",
    },
  })

  console.log("✅ Seeding selesai!")
  console.log(`📊 Data yang dibuat:`)
  console.log(`- 1 Tahun Ajaran: ${tahunAjaran.nama_ajaran}`)
  console.log(`- 2 Periode Ajaran`)
  console.log(`- 1 Tingkatan: ${tingkatan.nama_tingkatan}`)
  console.log(`- 1 Guru: ${guru.nama}`)
  console.log(`- 1 Kamar: ${kamar.nama_kamar}`)
  console.log(`- 1 Kelas: ${kelas.nama_kelas}`)
  console.log(`- 2 Siswa`)
  console.log(`- 2 Mata Pelajaran`)
  console.log(`- 1 Kitab: ${kitab.nama_kitab}`)
  console.log(`- 2 Kurikulum`)
  console.log(`- 2 Indikator Sikap`)
  console.log(`- 1 Penanggung Jawab Rapot`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
