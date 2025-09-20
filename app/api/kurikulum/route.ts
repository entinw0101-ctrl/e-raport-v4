import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const data = await prisma.kurikulum.findMany({
      orderBy: { id: "asc" },
      include: {
        mata_pelajaran: true,
        kitab: true,
        tingkatan: true
      }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching kurikulum:", error)
    return NextResponse.json({ error: "Failed to fetch kurikulum" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { mapel_id, kitab_id, batas_hafalan, tingkatan_id } = body

    if (!tingkatan_id) {
      return NextResponse.json({ error: "Tingkatan ID is required" }, { status: 400 })
    }

    const data = await prisma.kurikulum.create({
      data: {
        mapel_id: mapel_id ? Number.parseInt(mapel_id) : null,
        kitab_id: kitab_id ? Number.parseInt(kitab_id) : null,
        batas_hafalan,
        tingkatan_id: Number.parseInt(tingkatan_id)
      },
      include: {
        mata_pelajaran: true,
        kitab: true,
        tingkatan: true
      }
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating kurikulum:", error)
    return NextResponse.json({ error: "Failed to create kurikulum" }, { status: 500 })
  }
}
