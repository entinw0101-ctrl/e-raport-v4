import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PredikatHafalan } from "@prisma/client";

// GET (Daftar Nilai Hafalan dengan Filter dan Paginasi)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const siswa_id = searchParams.get("siswa_id")
    const mapel_id = searchParams.get("mapel_id")
    const periode_ajaran_id = searchParams.get("periode_ajaran_id")
    const kelas_id = searchParams.get("kelas_id")

    const skip = (page - 1) * per_page

    // Membangun klausa 'where' untuk filter
    const where: any = {}
    if (siswa_id) where.siswa_id = Number.parseInt(siswa_id);
    if (mapel_id) where.mapel_id = Number.parseInt(mapel_id);
    if (periode_ajaran_id) where.periode_ajaran_id = Number.parseInt(periode_ajaran_id);
    if (kelas_id) where.siswa = { kelas_id: Number.parseInt(kelas_id) };
    

// Mengambil total data dan data dengan paginasi secara bersamaan
const [total, data] = await prisma.$transaction([
    prisma.nilaiHafalan.count({ where }),
    prisma.nilaiHafalan.findMany({
 where,
 include: {
 siswa: { include: { kelas: { include: { tingkatan: true } } } },
 mata_pelajaran: true,
 periode_ajaran: { include: { master_tahun_ajaran: true } },
 },
 orderBy: [{ siswa: { nama: "asc" } }, { mata_pelajaran: { nama_mapel: "asc" } }],
 skip,
 take: per_page,
 })
]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page),
      },
    });

  } catch (error) {
    console.error("Error fetching nilai hafalan:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data nilai hafalan" }, { status: 500 });
  }
}

// POST (Membuat Nilai Hafalan Baru)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validasi input
    const { siswa_id, mapel_id, periode_ajaran_id, predikat, target_hafalan } = body;
    if (!siswa_id || !mapel_id || !periode_ajaran_id || !predikat) {
      return NextResponse.json({ success: false, error: "Siswa, mata pelajaran, periode ajaran, dan predikat wajib diisi" }, { status: 400 });
    }

    // Validasi apakah predikat sesuai dengan Enum
    if (!Object.values(PredikatHafalan).includes(predikat)) {
        return NextResponse.json({ success: false, error: `Predikat tidak valid. Pilih salah satu dari: ${Object.values(PredikatHafalan).join(', ')}` }, { status: 400 });
    }

    // Cek apakah nilai sudah ada
    const existingNilai = await prisma.nilaiHafalan.findUnique({
      where: {
        siswa_id_mapel_id_periode_ajaran_id: { siswa_id, mapel_id, periode_ajaran_id },
      },
    });

    if (existingNilai) {
      return NextResponse.json({ success: false, error: "Nilai untuk siswa, mata pelajaran, dan periode ini sudah ada" }, { status: 409 }); // 409 Conflict lebih sesuai
    }

    // Membuat data baru
    const nilaiHafalan = await prisma.nilaiHafalan.create({
      data: { siswa_id, mapel_id, periode_ajaran_id, predikat, target_hafalan: target_hafalan || null },
      include: {
        siswa: { include: { kelas: true } },
        mata_pelajaran: true,
        periode_ajaran: { include: { master_tahun_ajaran: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: nilaiHafalan,
      message: "Nilai hafalan berhasil ditambahkan",
    }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Error creating nilai hafalan:", error);
    return NextResponse.json({ success: false, error: "Gagal menambahkan nilai hafalan" }, { status: 500 });
  }
}
