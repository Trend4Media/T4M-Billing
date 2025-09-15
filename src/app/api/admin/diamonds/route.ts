import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('periodId')

    if (!periodId) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 })
    }

    // Get diamond aggregation by manager for the period
    const diamondStats = await prisma.revenueItem.groupBy({
      by: ['managerId', 'periodId'],
      where: {
        periodId: periodId
      },
      _sum: {
        diamonds: true
      },
      _count: {
        creatorId: true
      }
    })

    // Get manager details
    const managerIds = diamondStats.map(stat => stat.managerId)
    const managers = await prisma.user.findMany({
      where: {
        id: { in: managerIds }
      },
      select: {
        id: true,
        name: true,
        role: true
      }
    })

    // Combine data
    const result = diamondStats.map(stat => {
      const manager = managers.find(m => m.id === stat.managerId)
      return {
        managerId: stat.managerId,
        managerName: manager?.name || 'Unknown',
        managerRole: manager?.role || 'Unknown',
        periodId: stat.periodId,
        totalDiamonds: stat._sum.diamonds || 0,
        creatorCount: stat._count.creatorId || 0
      }
    })

    // Calculate total diamonds for the period
    const totalDiamonds = result.reduce((sum, stat) => sum + stat.totalDiamonds, 0)

    return NextResponse.json({
      periodId,
      totalDiamonds,
      managerStats: result
    })

  } catch (error) {
    console.error('Diamond stats error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Diamond-Statistiken' },
      { status: 500 }
    )
  }
}