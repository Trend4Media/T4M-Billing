import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentPeriodId } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('periodId') || getCurrentPeriodId()

    // Get all managers with their stats for the period
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ['TEAM_LEADER', 'SALES_REP'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        revenueItems: {
          where: { periodId },
          select: {
            estBaseUsd: true,
            estActivityUsd: true,
            diamonds: true
          }
        },
        commissions: {
          where: { periodId },
          select: {
            amountEur: true
          }
        },
        payouts: {
          where: { periodId },
          select: {
            status: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    })

    // Transform data to include calculated stats
    const managersWithStats = managers.map(manager => {
      // Calculate revenue stats
      const totalRevenue = manager.revenueItems.reduce((sum, item) => 
        sum + parseFloat(item.estBaseUsd.toString()) + parseFloat(item.estActivityUsd.toString()), 0
      )
      
      const totalDiamonds = manager.revenueItems.reduce((sum, item) => sum + item.diamonds, 0)
      
      const totalCommissions = manager.commissions.reduce((sum, commission) => 
        sum + parseFloat(commission.amountEur.toString()), 0
      )

      const payoutStatus = manager.payouts.length > 0 ? manager.payouts[0].status : null

      return {
        id: manager.id,
        name: manager.name,
        email: manager.email,
        role: manager.role,
        active: manager.active,
        createdAt: manager.createdAt.toISOString(),
        stats: {
          creatorCount: manager.revenueItems.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalCommissions: Math.round(totalCommissions * 100) / 100,
          totalDiamonds,
          payoutStatus
        }
      }
    })

    return NextResponse.json({
      success: true,
      managers: managersWithStats,
      period: periodId
    })

  } catch (error) {
    console.error('Get managers error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Manager-Daten' },
      { status: 500 }
    )
  }
}