import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

// Helper untuk mengambil nilai sel dengan aman
function getCellValue(row: ExcelJS.Row, cellIndex: number): string {
    const cell = row.getCell(cellIndex);
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object' && 'richText' in cell.value) {
        return (cell.value.richText as any[]).map(rt => rt.text).join('').trim();
    }
    if (typeof cell.value === 'object' && 'result' in cell.value) {
        return String((cell.value as { result: any }).result).trim();
    }
    return String(cell.value).trim();
}


export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "Tidak ada file yang diunggah." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer()) as any;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        // Find worksheet that contains "Template Nilai Hafalan"
        const worksheet = workbook.worksheets.find(ws => ws.name.includes("Template Nilai Hafalan"));
        if (!worksheet) {
            return NextResponse.json({ success: false, error: "Sheet dengan nama 'Template Nilai Hafalan' tidak ditemukan di dalam file." }, { status: 400 });
        }

        const results = {
            success: 0,
            errors: 0,
            errorDetails: [] as string[],
        };
        
        // Memulai transaksi database
        await prisma.$transaction(async (tx) => {
            // Looping dimulai dari baris kedua (setelah header)
            for (let i = 2; i <= worksheet.rowCount; i++) {
                const row = worksheet.getRow(i);
                
                // Mengambil data dari setiap sel. NIS di-unmerge secara otomatis oleh ExcelJS.
                const nis = getCellValue(row, 1);
                const namaMapel = getCellValue(row, 3);
                const targetHafalan = getCellValue(row, 5);
                const predikat = getCellValue(row, 6);
                const semester = getCellValue(row, 7);
                const tahunAjaranStr = getCellValue(row, 8);

                if (!nis || !namaMapel || !predikat) {
                    results.errors++;
                    results.errorDetails.push(`Baris ${i}: Data tidak lengkap (NIS, Nama Mapel, atau Predikat kosong).`);
                    continue;
                }

                // Cari entitas yang diperlukan dari database di dalam transaksi
                const siswa = await tx.siswa.findUnique({ where: { nis } });
                const mataPelajaran = await tx.mataPelajaran.findFirst({ where: { nama_mapel: namaMapel } });
                const periodeAjaran = await tx.periodeAjaran.findFirst({
                    where: {
                        semester: semester as any,
                        master_tahun_ajaran: { nama_ajaran: tahunAjaranStr }
                    },
                    include: { master_tahun_ajaran: true }
                });

                if (!siswa || !mataPelajaran || !periodeAjaran) {
                    results.errors++;
                    const missing = [
                        !siswa ? `Siswa (NIS: ${nis})` : '',
                        !mataPelajaran ? `Mapel (${namaMapel})` : '',
                        !periodeAjaran ? `Periode (${tahunAjaranStr} Sem ${semester})` : ''
                    ].filter(Boolean).join(', ');
                    results.errorDetails.push(`Baris ${i}: ${missing} tidak ditemukan.`);
                    continue;
                }

                // Mapping dari display value ke enum value
                let enumPredikat: any;
                if (predikat === "Tercapai") {
                    enumPredikat = "TERCAPAI";
                } else if (predikat === "Tidak Tercapai") {
                    enumPredikat = "TIDAK_TERCAPAI";
                } else {
                    results.errors++;
                    results.errorDetails.push(`Baris ${i}: Predikat '${predikat}' tidak valid. Gunakan 'Tercapai' atau 'Tidak Tercapai'.`);
                    continue;
                }

                // Melakukan operasi UPSERT (Update or Insert)
                await tx.nilaiHafalan.upsert({
                    where: {
                        siswa_id_mapel_id_periode_ajaran_id: {
                            siswa_id: siswa.id,
                            mapel_id: mataPelajaran.id,
                            periode_ajaran_id: periodeAjaran.id,
                        },
                    },
                    update: {
                        predikat: enumPredikat,
                        target_hafalan: targetHafalan || null,
                    },
                    create: {
                        siswa_id: siswa.id,
                        mapel_id: mataPelajaran.id,
                        periode_ajaran_id: periodeAjaran.id,
                        predikat: enumPredikat,
                        target_hafalan: targetHafalan || null,
                    },
                });

                results.success++;
            }
            
            // Jika ada error selama proses, transaction akan otomatis rollback
            if (results.errors > 0) {
                 throw new Error("Terjadi kesalahan pada beberapa baris, semua perubahan dibatalkan.");
            }
        });


        return NextResponse.json({
            success: true,
            message: `Berhasil mengimpor ${results.success} data nilai hafalan.`,
            results,
        });

    } catch (error: any) {
        console.error("Error processing uploaded file:", error);
        return NextResponse.json(
          { success: false, error: "Gagal memproses file Excel.", details: error.message },
          { status: 500 }
        );
    }
}
