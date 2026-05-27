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

  // Eager connection call removed to prevent serverless container pool exhaustion.
  // Prisma will connect lazily on first query execution.
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
