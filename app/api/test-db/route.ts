import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    console.log("Testing database connection...")
    console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)
    console.log("NODE_ENV:", process.env.NODE_ENV)

    // Test connection
    await prisma.$connect()
    console.log("✅ Database connection successful")

    // Test simple query
    const count = await prisma.indikatorKehadiran.count()
    console.log(`✅ Query successful, found ${count} records`)

    // Get mata pelajaran Hafalan
    const mataPelajaranHafalan = await prisma.mataPelajaran.findMany({
      where: { jenis: "Hafalan" },
      select: { id: true, nama_mapel: true }
    })
    console.log("Mata Pelajaran Hafalan:", mataPelajaranHafalan)

    // Get kitab
    const kitab = await prisma.kitab.findMany({
      select: { id: true, nama_kitab: true }
    })
    console.log("Kitab:", kitab)

    // Get tingkatan
    const tingkatan = await prisma.tingkatan.findMany({
      select: { id: true, nama_tingkatan: true }
    })
    console.log("Tingkatan:", tingkatan)

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      recordCount: count,
      mataPelajaranHafalan,
      kitab,
      tingkatan,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    })
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    return NextResponse.json({
      success: false,
      error: "Database connection failed",
      details: error instanceof Error ? error.message : 'Unknown error',
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 500 })
  }
}