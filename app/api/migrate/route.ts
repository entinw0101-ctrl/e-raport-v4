import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST() {
  try {
    console.log("Starting database migration...")

    // Check if we're in production and have proper permissions
    if (process.env.NODE_ENV === "production") {
      // In production, we should be careful with migrations
      // This endpoint should only be called during deployment
      console.log("Production environment detected")

      // Run Prisma migrations
      console.log("Running: npx prisma migrate deploy")
      const { stdout: migrateStdout, stderr: migrateStderr } = await execAsync("npx prisma migrate deploy")

      console.log("Migration stdout:", migrateStdout)
      if (migrateStderr) console.log("Migration stderr:", migrateStderr)

      // Generate Prisma client
      console.log("Running: npx prisma generate")
      const { stdout: generateStdout, stderr: generateStderr } = await execAsync("npx prisma generate")

      console.log("Generate stdout:", generateStdout)
      if (generateStderr) console.log("Generate stderr:", generateStderr)

      return NextResponse.json({
        success: true,
        message: "Database migration completed successfully",
        details: {
          migration: migrateStdout,
          generate: generateStdout
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Migration endpoint only available in production",
        details: "Use local development commands for local environment"
      }, { status: 403 })
    }
  } catch (error) {
    console.error("Migration failed:", error)
    return NextResponse.json({
      success: false,
      error: "Database migration failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: "Use POST method to run migrations",
    usage: "POST /api/migrate"
  }, { status: 405 })
}