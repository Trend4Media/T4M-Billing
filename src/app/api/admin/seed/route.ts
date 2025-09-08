import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function POST(request: NextRequest) {
  const prisma = new PrismaClient()
  
  try {
    console.log('🌱 Starting database seed...')

    // Test database connection first
    await prisma.$connect()
    console.log('✅ Database connected')

    // Check if users table exists and count users
    const userCount = await prisma.user.count()
    console.log(`📊 Current user count: ${userCount}`)

    if (userCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Datenbank bereits initialisiert! ${userCount} Benutzer gefunden.`,
        userCount
      })
    }

    // Import bcryptjs dynamically to avoid potential issues
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('password123', 12)
    console.log('✅ Password hashed')

    // Create admin user first
    const admin = await prisma.user.create({
      data: {
        email: 'admin@trend4media.local',
        name: 'Admin User',
        role: 'ADMIN',
        hash: hashedPassword,
        active: true,
      },
    })
    console.log('✅ Admin user created:', admin.id)

    // Create team leader
    const teamLeader = await prisma.user.create({
      data: {
        email: 'teamleader@trend4media.local',
        name: 'Team Leader',
        role: 'TEAM_LEADER',
        hash: hashedPassword,
        active: true,
      },
    })
    console.log('✅ Team Leader created:', teamLeader.id)

    // Create live manager
    const liveManager = await prisma.user.create({
      data: {
        email: 'livemanager@trend4media.local',
        name: 'Live Manager',
        role: 'SALES_REP',
        hash: hashedPassword,
        active: true,
      },
    })
    console.log('✅ Live Manager created:', liveManager.id)

    // Create current period
    const now = new Date()
    const periodId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    
    const period = await prisma.period.create({
      data: {
        id: periodId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        usdEurRate: 0.92,
        status: 'ACTIVE',
      },
    })
    console.log('✅ Period created:', period.id)

    return NextResponse.json({
      success: true,
      message: 'Datenbank erfolgreich initialisiert!',
      users: [
        { email: admin.email, role: admin.role, id: admin.id },
        { email: teamLeader.email, role: teamLeader.role, id: teamLeader.id },
        { email: liveManager.email, role: liveManager.role, id: liveManager.id }
      ],
      period: period.id
    })

  } catch (error) {
    console.error('❌ Seed error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Fehler beim Seeding der Datenbank', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Seed API is working. Use POST to initialize database.',
    timestamp: new Date().toISOString()
  })
}