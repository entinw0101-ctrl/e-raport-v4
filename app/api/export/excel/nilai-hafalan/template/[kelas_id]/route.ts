import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { PredikatHafalan } from "@prisma/client"; // Pastikan Enum diimpor


/**
 * Menerapkan styling (warna header dan border) ke seluruh sheet.
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

  // Menambahkan border ke SEMUA sel yang digunakan
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
 * Menggabungkan sel untuk kolom NIS dan Nama Siswa.
 */
function mergeCellsForStudent(sheet: ExcelJS.Worksheet, startRow: number, endRow: number, siswa: { nis: string; nama: string }) {
    // Always set the NIS and Nama values in the cells
    for (let row = startRow; row <= endRow; row++) {
        const nisCell = sheet.getCell(`A${row}`);
        nisCell.value = siswa.nis;
        nisCell.alignment = { vertical: 'middle', horizontal: 'center' };

        const namaCell = sheet.getCell(`B${row}`);
        namaCell.value = siswa.nama;
        namaCell.alignment = { vertical: 'middle', horizontal: 'left' };
    }

    // Merge cells only if there are multiple rows
    if (startRow < endRow) {
        sheet.mergeCells(`A${startRow}:A${endRow}`);
        sheet.mergeCells(`B${startRow}:B${endRow}`);
    }
}


// ==================================================================================
// INTI LOGIKA ANDA (Dengan Penyesuaian)
// ==================================================================================

export async function GET(request: NextRequest, { params }: { params: Promise<{ kelas_id: string }> }) {
  try {
    const resolvedParams = await params
    const kelasId = parseInt(resolvedParams.kelas_id)
    const { searchParams } = new URL(request.url)
    const periodeAjaranId = searchParams.get("periode_ajaran_id")

    if (isNaN(kelasId)) {
      return NextResponse.json({ success: false, error: "ID kelas tidak valid" }, { status: 400 })
    }

    if (!periodeAjaranId) {
      return NextResponse.json({ success: false, error: "ID periode ajaran diperlukan" }, { status: 400 })
    }

    // Mengambil data kelas, siswa, kurikulum, dan periode (tidak ada perubahan di sini)
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      include: { tingkatan: true },
    })

    if (!kelas?.tingkatan) {
      return NextResponse.json({ success: false, error: "Kelas atau tingkatan tidak ditemukan" }, { status: 404 })
    }
    
    const siswaInKelas = await prisma.siswa.findMany({
        where: { 
            kelas_id: kelasId, 
            status: "Aktif",
            nama: { not: null }
        },
        select: { id: true, nama: true, nis: true },
        orderBy: { nama: "asc" },
    }) as { id: number; nama: string; nis: string }[];

    if (siswaInKelas.length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada siswa aktif di kelas ini" }, { status: 404 })
    }

    const kurikulumHafalan = await prisma.kurikulum.findMany({
        where: {
            tingkatan_id: kelas.tingkatan.id,
            mata_pelajaran: { jenis: "Hafalan" },
        },
        include: {
            mata_pelajaran: { select: { id: true, nama_mapel: true } },
            kitab: { select: { id: true, nama_kitab: true } },
        },
        orderBy: { mata_pelajaran: { nama_mapel: "asc" } },
    });
    
    const validKurikulum = kurikulumHafalan.filter((item) => item.mata_pelajaran !== null);

    if (validKurikulum.length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada mata pelajaran hafalan untuk tingkatan ini" }, { status: 404 })
    }

    const periodeAjaran = await prisma.periodeAjaran.findUnique({
        where: { id: parseInt(periodeAjaranId) },
        include: { master_tahun_ajaran: true }
    });

    if (!periodeAjaran?.master_tahun_ajaran) {
      return NextResponse.json({ success: false, error: "Periode ajaran tidak ditemukan" }, { status: 404 })
    }

    // Membuat workbook Excel
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(`Template Nilai Hafalan - ${kelas.nama_kelas}`)

    // Mendefinisikan Kolom (Ini akan otomatis membuat header di baris pertama)
    worksheet.columns = [
      { header: "NIS", key: "nis", width: 15 },
      { header: "Nama Siswa", key: "nama", width: 30 },
      { header: "Nama Mapel", key: "nama_mapel", width: 25 },
      { header: "Kitab", key: "kitab", width: 20 },
      { header: "Target Hafalan", key: "target_hafalan", width: 25 },
      { header: "Predikat", key: "predikat", width: 20 },
      { header: "Semester", key: "semester", width: 12 },
      { header: "Tahun Ajaran", key: "tahun_ajaran", width: 15 },
    ]

    // Mengisi data siswa dan mata pelajaran
    let currentRow = 2; // Mulai dari baris 2 karena baris 1 adalah header
    for (const siswa of siswaInKelas) {
        const startRow = currentRow;
        for (const kurikulum of validKurikulum) {
            worksheet.addRow({
                nama_mapel: kurikulum.mata_pelajaran!.nama_mapel,
                kitab: kurikulum.kitab?.nama_kitab || '-',
                target_hafalan: kurikulum.batas_hafalan || '',
                semester: periodeAjaran.semester,
                tahun_ajaran: periodeAjaran.master_tahun_ajaran.nama_ajaran
            });
            currentRow++;
        }
        const endRow = currentRow - 1;
        // Panggil fungsi merge setelah semua baris mapel untuk satu siswa ditambahkan
        mergeCellsForStudent(worksheet, startRow, endRow, siswa);
    }
    
    // ==================================================================================
    // PERBAIKAN UTAMA 1: TAMBAHKAN BLOK INI UNTUK MEMBUAT DROPDOWN
    // ==================================================================================
    // Menggunakan nilai display yang sesuai dengan @map di enum
    const predikatList = ["Tercapai", "Tidak Tercapai"];
    const predikatFormula = `"${predikatList.join(",")}"`;

    // Kolom 'F' adalah kolom ke-6 untuk 'Predikat'
    for (let i = 2; i <= worksheet.rowCount; i++) {
        const cell = worksheet.getCell(`F${i}`);
        cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [predikatFormula],
            showErrorMessage: true,
            errorTitle: 'Predikat Tidak Valid',
            error: `Harap pilih salah satu dari: ${predikatList.join(", ")}`
        };
    }

    // ==================================================================================
    // PERBAIKAN UTAMA 2: PANGGIL FUNGSI STYLING DI AKHIR
    // ==================================================================================
    applySheetStyling(worksheet);

    // Generate buffer dan kirimkan file
    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = `Template_Nilai_Hafalan_${kelas.nama_kelas}_${periodeAjaran.master_tahun_ajaran.nama_ajaran.replace('/', '-')}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error generating nilai hafalan template:", error)
    return NextResponse.json({ success: false, error: "Gagal membuat template nilai hafalan" }, { status: 500 })
  }
}