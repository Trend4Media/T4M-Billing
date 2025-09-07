import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Seeding production database...')

    // Check if users already exist
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@trend4media.local' }
    })

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: 'Datenbank bereits initialisiert!',
        users: [
          { email: 'admin@trend4media.local', role: 'ADMIN' },
          { email: 'teamleader@trend4media.local', role: 'TEAM_LEADER' },
          { email: 'livemanager@trend4media.local', role: 'SALES_REP' }
        ]
      })
    }

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 12)

    // Create users
    const admin = await prisma.user.create({
      data: {
        email: 'admin@trend4media.local',
        name: 'Admin User',
        role: 'ADMIN',
        hash: hashedPassword,
        active: true,
      },
    })

    const teamLeader = await prisma.user.create({
      data: {
        email: 'teamleader@trend4media.local',
        name: 'Team Leader',
        role: 'TEAM_LEADER',
        hash: hashedPassword,
        active: true,
      },
    })

    const liveManager = await prisma.user.create({
      data: {
        email: 'livemanager@trend4media.local',
        name: 'Live Manager',
        role: 'SALES_REP',
        hash: hashedPassword,
        active: true,
      },
    })

    // Create default RuleSet
    await prisma.ruleSet.create({
      data: {
        id: 'default-rules-2024',
        jsonRules: {
          salesRep: {
            baseCommission: 0.30,
            activityCommission: 0.30,
            fixedBonuses: {
              m0_5: 75,
              m1: 150,
              m1_retention: 100,
              m2: 400,
            },
          },
          teamLeader: {
            baseCommission: 0.35,
            activityCommission: 0.35,
            fixedBonuses: {
              m0_5: 80,
              m1: 165,
              m1_retention: 120,
              m2: 450,
            },
            downlineRates: {
              levelA: 0.10,
              levelB: 0.075,
              levelC: 0.05,
            },
            teamBonus: {
              rate: 0.10,
              recruitment: 50,
              graduation: 50,
            },
          },
          teamTargets: {
            minTeamRevenue: 10000,
          },
        },
        activeFrom: new Date('2024-01-01'),
        isActive: true,
      },
    })

    // Create current period
    const now = new Date()
    const periodId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    
    await prisma.period.create({
      data: {
        id: periodId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        usdEurRate: 0.92,
        status: 'ACTIVE',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      users: [
        { email: 'admin@trend4media.local', role: 'ADMIN' },
        { email: 'teamleader@trend4media.local', role: 'TEAM_LEADER' },
        { email: 'livemanager@trend4media.local', role: 'SALES_REP' }
      ],
      period: periodId
    })

  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { 
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