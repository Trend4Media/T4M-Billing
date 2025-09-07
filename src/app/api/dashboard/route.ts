import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, getCurrentPeriodId } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('periodId') || getCurrentPeriodId()
    const userId = session.user.id

    // Get manager's commission data for the period
    const commissions = await prisma.commissionLedger.findMany({
      where: {
        userId,
        periodId
      },
      orderBy: { component: 'asc' }
    })

    // Get manager's creators and their revenue
    const creators = await prisma.creator.findMany({
      where: {
        managerId: userId,
        active: true
      },
      include: {
        revenueItems: {
          where: { periodId },
          select: {
            diamonds: true,
            estBaseUsd: true,
            estActivityUsd: true,
            m0_5: true,
            m1: true,
            m1Retention: true,
            m2: true
          }
        }
      }
    })

    // Calculate KPIs
    const kpis = {
      totalEarnings: 0,
      baseCommission: 0,
      activityCommission: 0,
      bonusTotal: 0,
      downlineTotal: 0,
      teamBonus: 0,
      creatorCount: creators.length,
      activeCreators: creators.filter(c => c.revenueItems.length > 0).length,
      totalDiamonds: 0,
      personalRevenueUsd: 0,
      milestoneAchievements: {
        m0_5: 0,
        m1: 0,
        m1_retention: 0,
        m2: 0
      }
    }

    // Calculate from commission ledger
    const componentTotals: Record<string, number> = {}
    
    commissions.forEach(commission => {
      const amount = parseFloat(commission.amountEur.toString())
      kpis.totalEarnings += amount
      componentTotals[commission.component] = (componentTotals[commission.component] || 0) + amount

      switch (commission.component) {
        case 'BASE_COMMISSION':
          kpis.baseCommission += amount
          break
        case 'ACTIVITY_COMMISSION':
          kpis.activityCommission += amount
          break
        case 'M0_5_BONUS':
        case 'M1_BONUS':
        case 'M1_RETENTION_BONUS':
        case 'M2_BONUS':
          kpis.bonusTotal += amount
          break
        case 'DOWNLINE_A':
        case 'DOWNLINE_B':
        case 'DOWNLINE_C':
          kpis.downlineTotal += amount
          break
        case 'TEAM_BONUS':
        case 'TEAM_RECRUITMENT':
        case 'TEAM_GRADUATION':
          kpis.teamBonus += amount
          break
      }
    })

    // Calculate from creator data
    creators.forEach(creator => {
      creator.revenueItems.forEach(item => {
        kpis.totalDiamonds += item.diamonds
        kpis.personalRevenueUsd += parseFloat(item.estBaseUsd.toString()) + parseFloat(item.estActivityUsd.toString())
        
        if (item.m0_5) kpis.milestoneAchievements.m0_5++
        if (item.m1) kpis.milestoneAchievements.m1++
        if (item.m1Retention) kpis.milestoneAchievements.m1_retention++
        if (item.m2) kpis.milestoneAchievements.m2++
      })
    })

    // Get downline data for Team Leaders
    let downlineData = []
    if (session.user.role === 'TEAM_LEADER') {
      const downlineRelations = await prisma.orgRelation.findMany({
        where: {
          ancestorId: userId,
          depth: { in: [1, 2, 3] }
        },
        include: {
          descendant: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              revenueItems: {
                where: { periodId },
                select: {
                  estBaseUsd: true,
                  estActivityUsd: true
                }
              }
            }
          }
        }
      })

      downlineData = downlineRelations.map(relation => ({
        level: relation.depth,
        levelName: relation.depth === 1 ? 'A' : relation.depth === 2 ? 'B' : 'C',
        manager: {
          id: relation.descendant.id,
          name: relation.descendant.name,
          email: relation.descendant.email,
          role: relation.descendant.role
        },
        personalRevenue: relation.descendant.revenueItems.reduce((sum, item) => 
          sum + parseFloat(item.estBaseUsd.toString()) + parseFloat(item.estActivityUsd.toString()), 0
        ),
        commission: componentTotals[`DOWNLINE_${relation.depth === 1 ? 'A' : relation.depth === 2 ? 'B' : 'C'}`] || 0
      }))
    }

    // Get payout data
    const payout = await prisma.payout.findUnique({
      where: {
        periodId_managerId: {
          periodId,
          managerId: userId
        }
      },
      include: {
        lines: true
      }
    })

    // Get payout history
    const payoutHistory = await prisma.payout.findMany({
      where: { managerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        period: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        kpis,
        componentBreakdown: componentTotals,
        creators: creators.map(creator => ({
          id: creator.id,
          handle: creator.handle,
          diamonds: creator.revenueItems.reduce((sum, item) => sum + item.diamonds, 0),
          revenue: creator.revenueItems.reduce((sum, item) => 
            sum + parseFloat(item.estBaseUsd.toString()) + parseFloat(item.estActivityUsd.toString()), 0
          ),
          milestones: creator.revenueItems.length > 0 ? {
            m0_5: creator.revenueItems[0].m0_5,
            m1: creator.revenueItems[0].m1,
            m1_retention: creator.revenueItems[0].m1Retention,
            m2: creator.revenueItems[0].m2
          } : null
        })),
        downline: downlineData,
        payout: payout ? {
          id: payout.id,
          amount: parseFloat(payout.amountEur.toString()),
          status: payout.status,
          requestedAt: payout.requestedAt,
          processedAt: payout.processedAt,
          notes: payout.notes,
          lines: payout.lines.map(line => ({
            component: line.component,
            amount: parseFloat(line.amountEur.toString())
          }))
        } : null,
        payoutHistory: payoutHistory.map(p => ({
          id: p.id,
          period: p.period.id,
          amount: parseFloat(p.amountEur.toString()),
          status: p.status,
          requestedAt: p.requestedAt,
          processedAt: p.processedAt
        }))
      }
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Dashboard-Daten' },
      { status: 500 }
    )
  }
}