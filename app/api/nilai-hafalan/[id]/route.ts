import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PredikatHafalan } from "@prisma/client";

// GET (Detail Nilai Hafalan)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id);
    if (isNaN(id)) {
        return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 });
    }

    const nilaiHafalan = await prisma.nilaiHafalan.findUnique({
      where: { id },
      include: {
        siswa: { include: { kelas: { include: { tingkatan: true } } } },
        mata_pelajaran: true,
        periode_ajaran: { include: { master_tahun_ajaran: true } },
      },
    });

    if (!nilaiHafalan) {
      return NextResponse.json({ success: false, error: "Nilai hafalan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: nilaiHafalan });

  } catch (error) {
    console.error(`Error fetching nilai hafalan with id ${params.id}:`, error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data nilai hafalan" }, { status: 500 });
  }
}

// PUT (Update Nilai Hafalan)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id);
     if (isNaN(id)) {
        return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 });
    }
    const body = await request.json();

    const { predikat, target_hafalan } = body;

    // Validasi apakah predikat sesuai dengan Enum jika diberikan
    if (predikat && !Object.values(PredikatHafalan).includes(predikat)) {
        return NextResponse.json({ success: false, error: `Predikat tidak valid. Pilih salah satu dari: ${Object.values(PredikatHafalan).join(', ')}` }, { status: 400 });
    }

    const nilaiHafalan = await prisma.nilaiHafalan.update({
      where: { id },
      data: { predikat, target_hafalan },
      include: {
        siswa: { include: { kelas: true } },
        mata_pelajaran: true,
        periode_ajaran: { include: { master_tahun_ajaran: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: nilaiHafalan,
      message: "Nilai hafalan berhasil diperbarui",
    });

  } catch (error: any) {
    // Menangani error jika record tidak ditemukan saat update
    if (error.code === 'P2025') {
        return NextResponse.json({ success: false, error: "Nilai hafalan tidak ditemukan" }, { status: 404 });
    }
    console.error(`Error updating nilai hafalan with id ${params.id}:`, error);
    return NextResponse.json({ success: false, error: "Gagal memperbarui nilai hafalan" }, { status: 500 });
  }
}

// DELETE (Hapus Nilai Hafalan)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id);
    if (isNaN(id)) {
        return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 });
    }

    await prisma.nilaiHafalan.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Nilai hafalan berhasil dihapus",
    });

  } catch (error: any) {
    // Menangani error jika record tidak ditemukan saat delete
     if (error.code === 'P2025') {
        return NextResponse.json({ success: false, error: "Nilai hafalan tidak ditemukan" }, { status: 404 });
    }
    console.error(`Error deleting nilai hafalan with id ${params.id}:`, error);
    return NextResponse.json({ success: false, error: "Gagal menghapus nilai hafalan" }, { status: 500 });
  }
}
