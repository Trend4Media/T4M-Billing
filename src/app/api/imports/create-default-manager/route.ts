import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if any managers exist
    const existingManagers = await prisma.user.findMany({
      where: {
        role: { in: ['TEAM_LEADER', 'SALES_REP'] },
        active: true
      }
    })

    if (existingManagers.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Manager bereits vorhanden',
        managers: existingManagers.map(m => ({ name: m.name, role: m.role }))
      })
    }

    // Create default Live Manager
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    const liveManager = await prisma.user.create({
      data: {
        email: 'livemanager@trend4media.local',
        name: 'Live Manager',
        role: 'TEAM_LEADER',
        active: true,
        hash: hashedPassword
      }
    })

    console.log('✅ Default Live Manager created:', liveManager.id)

    return NextResponse.json({
      success: true,
      message: 'Standard Live Manager erstellt',
      manager: {
        name: liveManager.name,
        email: liveManager.email,
        role: liveManager.role
      }
    })

  } catch (error) {
    console.error('Create default manager error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Standard-Managers' },
      { status: 500 }
    )
  }
}