import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CommissionEngine } from '@/lib/commission-engine'

export async function POST(
  request: NextRequest,
  { params }: { params: { periodId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = params

    // Check if period exists and is not locked
    const period = await prisma.period.findUnique({
      where: { id: periodId }
    })

    if (!period) {
      return NextResponse.json({ error: 'Periode nicht gefunden' }, { status: 404 })
    }

    if (period.status === 'LOCKED') {
      return NextResponse.json({ 
        error: 'Periode ist gesperrt und kann nicht neu berechnet werden' 
      }, { status: 400 })
    }

    if (!period.usdEurRate) {
      return NextResponse.json({ 
        error: 'USD/EUR Kurs muss vor der Berechnung gesetzt werden' 
      }, { status: 400 })
    }

    // Check if there are any revenue items for this period
    const revenueCount = await prisma.revenueItem.count({
      where: { periodId }
    })

    if (revenueCount === 0) {
      return NextResponse.json({ 
        error: 'Keine Revenue-Daten für diese Periode gefunden. Bitte zuerst Excel-Import durchführen.' 
      }, { status: 400 })
    }

    // Create commission engine and calculate
    const engine = await CommissionEngine.create(periodId)
    const calculations = await engine.calculateAllCommissions()

    // Calculate summary statistics
    const summary = {
      totalManagers: calculations.length,
      totalCommissionEur: calculations.reduce((sum, calc) => sum + calc.totalEur, 0),
      totalRevenueItems: revenueCount,
      componentBreakdown: {} as Record<string, { count: number; totalEur: number }>
    }

    // Calculate component breakdown
    for (const calculation of calculations) {
      for (const component of calculation.components) {
        const type = component.type
        if (!summary.componentBreakdown[type]) {
          summary.componentBreakdown[type] = { count: 0, totalEur: 0 }
        }
        summary.componentBreakdown[type].count++
        summary.componentBreakdown[type].totalEur += component.amountEur
      }
    }

    // Round totals
    summary.totalCommissionEur = Math.round(summary.totalCommissionEur * 100) / 100
    Object.values(summary.componentBreakdown).forEach(breakdown => {
      breakdown.totalEur = Math.round(breakdown.totalEur * 100) / 100
    })

    return NextResponse.json({
      success: true,
      message: 'Provisionen erfolgreich berechnet',
      summary,
      calculations: calculations.map(calc => ({
        managerId: calc.managerId,
        role: calc.role,
        totalEur: calc.totalEur,
        componentCount: calc.components.length
      }))
    })

  } catch (error) {
    console.error('Recalculate error:', error)
    return NextResponse.json(
      { 
        error: 'Fehler bei der Provisionsberechnung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}