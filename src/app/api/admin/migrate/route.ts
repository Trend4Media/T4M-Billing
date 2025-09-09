import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Running database migrations...')

    // Create system_settings table manually if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "system_settings" (
          "id" TEXT NOT NULL,
          "key" TEXT NOT NULL,
          "value" TEXT,
          "fileData" BYTEA,
          "mimeType" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
      )
    `

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key")
    `

    console.log('✅ Migrations completed')

    return NextResponse.json({
      success: true,
      message: 'Datenbank-Migrationen erfolgreich ausgeführt',
      tables: ['system_settings']
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Fehler bei der Migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  try {
    // Check which tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    return NextResponse.json({
      success: true,
      message: 'Database status',
      tables: tables
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Database check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}