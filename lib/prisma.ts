import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

try {
  prisma = globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })

  // For serverless environments, add connection management
  if (process.env.VERCEL_ENV) {
    // Disconnect on process exit to prevent connection leaks
    process.on('beforeExit', async () => {
      await prisma.$disconnect()
    })
  }

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

  // Add connection validation for production
  if (process.env.NODE_ENV === "production") {
    prisma.$connect()
      .then(() => {
        console.log("✅ Production Prisma client connected successfully")
      })
      .catch((error) => {
        console.error("❌ Production Prisma client connection failed:", error)
      })
  }
} catch (error) {
  console.error("❌ Failed to initialize Prisma client:", error)
  // Create a dummy client that will throw errors for all operations
  prisma = new Proxy({} as any, {
    get: () => {
      throw new Error("Prisma client failed to initialize. Check DATABASE_URL and database connection.")
    }
  })
}

export { prisma }
