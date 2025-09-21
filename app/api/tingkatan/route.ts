import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
   try {
     const data = await prisma.tingkatan.findMany({
       include: {
         kelas: {
           select: {
             nama_kelas: true,
           },
           orderBy: {
             nama_kelas: "asc",
           },
         },
       },
       orderBy: { urutan: "asc" },
     })

     // Transform data to include class names in display
     const transformedData = data.map((tingkatan) => ({
       ...tingkatan,
       display_name: tingkatan.kelas.length > 0
         ? `${tingkatan.kelas.map(k => k.nama_kelas).join(", ")} - ${tingkatan.nama_tingkatan}`
         : tingkatan.nama_tingkatan,
     }))

     return NextResponse.json({
       success: true,
       data: transformedData,
     })
   } catch (error) {
     console.error("Error fetching tingkatan:", error)
     return NextResponse.json({ success: false, error: "Gagal mengambil data tingkatan" }, { status: 500 })
   }
 }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nama_tingkatan || !body.urutan) {
      return NextResponse.json({ success: false, error: "Nama tingkatan dan urutan wajib diisi" }, { status: 400 })
    }

    // Check if urutan already exists
    const existingTingkatan = await prisma.tingkatan.findFirst({
      where: { urutan: Number.parseInt(body.urutan) },
    })

    if (existingTingkatan) {
      return NextResponse.json({ success: false, error: "Urutan sudah digunakan" }, { status: 400 })
    }

    const data = {
      ...body,
      urutan: Number.parseInt(body.urutan),
    }

    const tingkatan = await prisma.tingkatan.create({
      data,
    })

    return NextResponse.json({
      success: true,
      data: tingkatan,
      message: "Tingkatan berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating tingkatan:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan tingkatan" }, { status: 500 })
  }
}
