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
        
        // Pre-load lookups to avoid repeated queries
        const allNis = new Set<string>()
        const allMapel = new Set<string>()
        const allPeriodeData = new Set<string>()

        // Collect all unique values first
        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const nis = getCellValue(row, 1);
            const namaMapel = getCellValue(row, 3);
            const semester = getCellValue(row, 7);
            const tahunAjaranStr = getCellValue(row, 8);

            if (nis) allNis.add(nis);
            if (namaMapel) allMapel.add(namaMapel);
            if (semester && tahunAjaranStr) allPeriodeData.add(`${tahunAjaranStr}:${semester}`);
        }

        // Load all data in parallel
        const [siswaList, mapelList, periodeList] = await Promise.all([
            prisma.siswa.findMany({
                where: { nis: { in: Array.from(allNis) }, status: "Aktif" },
                include: { kelas: { include: { tingkatan: true } } }
            }),
            prisma.mataPelajaran.findMany({ where: { nama_mapel: { in: Array.from(allMapel) } } }),
            Promise.all(Array.from(allPeriodeData).map(async (periodeStr) => {
                const [tahunAjaran, semester] = periodeStr.split(':');
                return await prisma.periodeAjaran.findFirst({
                    where: {
                        semester: semester as any,
                        master_tahun_ajaran: { nama_ajaran: tahunAjaran }
                    },
                    include: { master_tahun_ajaran: true }
                });
            }))
        ]);

        // Create lookup maps
        const siswaMap = new Map(siswaList.map(s => [s.nis, s]));
        const mapelMap = new Map(mapelList.map(m => [m.nama_mapel, m]));
        const periodeMap = new Map(
            periodeList.filter(p => p !== null && p.master_tahun_ajaran !== null).map(p => [`${p!.master_tahun_ajaran!.nama_ajaran}:${p!.semester}`, p!])
        );

        // Get all tingkatan mappings for validation
        const siswaTingkatanMap = new Map()
        for (const siswa of siswaList) {
            if (siswa.kelas?.tingkatan?.id) {
                siswaTingkatanMap.set(siswa.nis, siswa.kelas.tingkatan.id)
            }
        }

        // Process upserts in parallel
        const upsertPromises: Promise<any>[] = []

        // Collect all valid upsert operations
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

            // Get entities from pre-loaded maps
            const siswa = siswaMap.get(nis);
            const mataPelajaran = mapelMap.get(namaMapel);
            const periodeAjaran = periodeMap.get(`${tahunAjaranStr}:${semester}`);

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

            // Validate that mata pelajaran is assigned to student's current tingkatan
            const studentTingkatanId = siswaTingkatanMap.get(nis);
            if (!studentTingkatanId) {
                results.errors++;
                results.errorDetails.push(`Baris ${i}: Siswa ${nis} tidak memiliki tingkatan yang valid.`);
                continue;
            }

            // Check if mata pelajaran is assigned to student's tingkatan via kurikulum
            const kurikulumExists = await prisma.kurikulum.findFirst({
                where: {
                    mapel_id: mataPelajaran.id,
                    tingkatan_id: studentTingkatanId,
                    mata_pelajaran: { jenis: "Hafalan" } // Ensure it's a hafalan subject
                }
            });

            if (!kurikulumExists) {
                results.errors++;
                results.errorDetails.push(`Baris ${i}: Mata pelajaran "${namaMapel}" tidak sesuai dengan tingkatan siswa ${nis}.`);
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

            // Create upsert promise
            const upsertPromise = prisma.nilaiHafalan.upsert({
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
            }).catch((error: any) => {
                console.error('Upsert error for nilai hafalan:', error)
                results.errors++
                results.errorDetails.push(`Baris ${i}: Error menyimpan data - ${error.message}`)
                return null
            })

            upsertPromises.push(upsertPromise)
        }

        // Execute all upserts in parallel
        if (upsertPromises.length > 0) {
            const upsertResults = await Promise.all(upsertPromises)
            results.success = upsertResults.filter(r => r !== null).length
        }


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
