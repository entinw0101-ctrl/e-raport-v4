import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession({ ...authOptions })

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Password lama dan baru harus diisi" },
        { status: 400 }
      )
    }

    // Get current admin
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email }
    })

    if (!admin) {
      return NextResponse.json(
        { message: "Admin tidak ditemukan" },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password)

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: "Password lama salah" },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedNewPassword }
    })

    return NextResponse.json(
      { message: "Password berhasil diubah" },
      { status: 200 }
    )

  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengubah password" },
      { status: 500 }
    )
  }
}