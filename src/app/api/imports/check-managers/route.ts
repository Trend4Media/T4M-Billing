import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const managers = await prisma.user.findMany({
      where: {
        role: { in: ['TEAM_LEADER', 'SALES_REP'] },
        active: true
      },
      select: {
        id: true,
        name: true,
        role: true
      }
    })

    return NextResponse.json({
      hasManagers: managers.length > 0,
      managerCount: managers.length,
      managers: managers.map(m => ({ name: m.name, role: m.role }))
    })

  } catch (error) {
    console.error('Check managers error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Überprüfen der Manager' },
      { status: 500 }
    )
  }
}