import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Mulai seeding admin accounts...")

  // Check if admin accounts already exist
  const existingAdmins = await prisma.admin.findMany()
  if (existingAdmins.length > 0) {
    console.log("⚠️  Admin accounts already exist, skipping seeding")
    return
  }

  // Seed Admin Accounts
  const adminAccounts = [
    {
      email: "akunadmin1@nuurushsholaah.com",
      password: "nuurushsholaah9173",
      name: "Admin 1",
      role: "admin" as const,
    },
    {
      email: "akunadmin2@nuurushsholaah.com",
      password: "nuurushsholaah7391",
      name: "Admin 2",
      role: "admin" as const,
    },
    {
      email: "matin.rusydan@gmail.com",
      password: "mtn991",
      name: "Developer",
      role: "developer" as const,
    },
  ]

  for (const account of adminAccounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10)
    await prisma.admin.create({
      data: {
        email: account.email,
        password: hashedPassword,
        name: account.name,
        role: account.role,
        status: "active",
      },
    })
  }

  console.log("✅ Seeding admin accounts selesai!")
  console.log(`📊 Admin accounts yang dibuat:`)
  console.log(`- 2 Admin accounts`)
  console.log(`- 1 Developer account`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
