import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PredikatHafalan } from "@prisma/client"; // Import Enum dari Prisma Client
import ExcelJS from "exceljs";

/**
 * Helper function untuk menerapkan styling dasar pada sheet Excel.
 */
function applySheetStyling(sheet: ExcelJS.Worksheet) {
  // Styling untuk baris header
  const headerRow = sheet.getRow(1);
  headerRow.font = {
    bold: true,
    color: { argb: "FFFFFFFF" }, // Teks putih
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F81BD" }, // Latar belakang biru tua
  };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // Menambahkan border ke semua sel yang digunakan
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });
}

/**
 * Helper function untuk menggabungkan sel NIS dan Nama Siswa.
 */
function mergeCellsForStudent(sheet: ExcelJS.Worksheet, startRow: number, endRow: number, siswa: { nis: string; nama: string }) {
    if (startRow > endRow) return;

    sheet.mergeCells(`A${startRow}:A${endRow}`);
    sheet.mergeCells(`B${startRow}:B${endRow}`);

    const nisCell = sheet.getCell(`A${startRow}`);
    nisCell.value = siswa.nis;
    nisCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const namaCell = sheet.getCell(`B${startRow}`);
    namaCell.value = siswa.nama;
    namaCell.alignment = { vertical: 'middle', horizontal: 'left' };
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas_id = searchParams.get("kelas_id");
    const periode_ajaran_id = searchParams.get("periode_ajaran_id");
    const tingkatan_id = searchParams.get("tingkatan_id");

    if (!kelas_id || !periode_ajaran_id || !tingkatan_id) {
      return NextResponse.json(
        { success: false, error: "Parameter kelas_id, periode_ajaran_id, dan tingkatan_id wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Ambil data yang diperlukan dari database
    const siswaList = await prisma.siswa.findMany({
      where: { kelas_id: Number(kelas_id) },
      select: { nis: true, nama: true },
      orderBy: { nama: "asc" },
    });

    const periodeAjaranInfo = await prisma.periodeAjaran.findUnique({
        where: { id: Number(periode_ajaran_id) },
        include: { master_tahun_ajaran: true }
    });

    // Ambil kurikulum spesifik untuk hafalan berdasarkan tingkatan
    const kurikulumHafalan = await prisma.kurikulum.findMany({
        where: {
            tingkatan_id: Number(tingkatan_id),
            mata_pelajaran: {
                jenis: 'Hafalan' // Asumsi jenis mapel hafalan adalah 'Hafalan'
            }
        },
        include: {
            mata_pelajaran: true,
            kitab: true
        },
        orderBy: {
            mata_pelajaran: { nama_mapel: 'asc' }
        }
    });

    // Filter out kurikulum without mata_pelajaran
    const validKurikulum = kurikulumHafalan.filter(k => k.mata_pelajaran !== null);

    if (siswaList.length === 0) {
        return NextResponse.json({ success: false, error: "Tidak ada siswa ditemukan di kelas ini." }, { status: 404 });
    }
    if (!periodeAjaranInfo) {
        return NextResponse.json({ success: false, error: "Periode ajaran tidak ditemukan." }, { status: 404 });
    }
    if (!periodeAjaranInfo.master_tahun_ajaran) {
        return NextResponse.json({ success: false, error: "Data tahun ajaran tidak lengkap." }, { status: 404 });
    }

    if (validKurikulum.length === 0) {
        return NextResponse.json({ success: false, error: "Tidak ada mata pelajaran hafalan untuk tingkatan ini." }, { status: 404 });
    }


    // 2. Buat workbook dan worksheet Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Template Hafalan");

    sheet.columns = [
      { header: "NIS", key: "nis", width: 15 },
      { header: "Nama Siswa", key: "nama", width: 30 },
      { header: "Nama Mapel", key: "nama_mapel", width: 25 },
      { header: "Kitab", key: "kitab", width: 20 },
      { header: "Target Hafalan", key: "target_hafalan", width: 20 },
      { header: "Predikat", key: "predikat", width: 20 },
      { header: "Semester", key: "semester", width: 12 },
      { header: "Tahun Ajaran", key: "tahun_ajaran", width: 15 },
    ];
    
    // 3. Isi data ke dalam sheet
    let currentRow = 2;
    for (const siswa of siswaList) {
        const startRow = currentRow;
        for (const kurikulum of validKurikulum) {
            sheet.addRow({
                // NIS dan Nama akan diisi setelah merge
                nama_mapel: kurikulum.mata_pelajaran!.nama_mapel,
                kitab: kurikulum.kitab?.nama_kitab || '-',
                target_hafalan: kurikulum.batas_hafalan || '',
                semester: periodeAjaranInfo.semester,
                tahun_ajaran: periodeAjaranInfo.master_tahun_ajaran!.nama_ajaran
            });
            currentRow++;
        }
        const endRow = currentRow - 1;
        mergeCellsForStudent(sheet, startRow, endRow, { nis: siswa.nis, nama: siswa.nama || 'N/A' });
    }
    
    // 4. Terapkan data validation (dropdown) untuk kolom predikat
    // Menggunakan nilai display yang sesuai dengan @map di enum
    const predikatList = ["Tercapai", "Tidak Tercapai"];
    const predikatFormula = `"${predikatList.join(",")}"`;

    // Kolom 'F' adalah kolom Predikat
    for (let i = 2; i <= sheet.rowCount; i++) {
        const cell = sheet.getCell(`F${i}`);
        cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [predikatFormula],
            showErrorMessage: true,
            errorTitle: 'Predikat Tidak Valid',
            error: `Harap pilih salah satu dari: ${predikatList.join(", ")}`
        };
    }

    // 5. Terapkan styling
    applySheetStyling(sheet);

    // 6. Generate buffer dan kirim sebagai response
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Template_Nilai_Hafalan_${periodeAjaranInfo.master_tahun_ajaran!.nama_ajaran.replace('/', '-')}_Semester_${periodeAjaranInfo.semester}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });

  } catch (error: any) {
    console.error("Error generating hafalan template:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat template Excel hafalan", details: error.message },
      { status: 500 }
    );
  }
}
