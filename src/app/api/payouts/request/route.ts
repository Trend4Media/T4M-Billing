import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentPeriodId } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const periodId = body.periodId || getCurrentPeriodId()
    const managerId = session.user.id

    // Check if period exists and is not locked
    const period = await prisma.period.findUnique({
      where: { id: periodId }
    })

    if (!period) {
      return NextResponse.json({ error: 'Periode nicht gefunden' }, { status: 404 })
    }

    // Check if payout already exists
    const existingPayout = await prisma.payout.findUnique({
      where: {
        periodId_managerId: {
          periodId,
          managerId
        }
      }
    })

    if (existingPayout) {
      return NextResponse.json({ 
        error: 'Auszahlung bereits beantragt oder erstellt' 
      }, { status: 400 })
    }

    // Get all commissions for this manager and period
    const commissions = await prisma.commissionLedger.findMany({
      where: {
        userId: managerId,
        periodId
      }
    })

    if (commissions.length === 0) {
      return NextResponse.json({ 
        error: 'Keine Provisionen für diese Periode gefunden' 
      }, { status: 400 })
    }

    // Calculate total amount
    const totalAmount = commissions.reduce((sum, commission) => 
      sum + parseFloat(commission.amountEur.toString()), 0
    )

    if (totalAmount <= 0) {
      return NextResponse.json({ 
        error: 'Gesamtbetrag muss größer als 0 sein' 
      }, { status: 400 })
    }

    // Create payout with lines
    const payout = await prisma.payout.create({
      data: {
        periodId,
        managerId,
        amountEur: totalAmount,
        status: 'SUBMITTED',
        requestedAt: new Date(),
        lines: {
          create: commissions.map(commission => ({
            component: commission.component,
            amountEur: parseFloat(commission.amountEur.toString())
          }))
        }
      },
      include: {
        lines: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Auszahlung erfolgreich beantragt',
      payout: {
        id: payout.id,
        amount: parseFloat(payout.amountEur.toString()),
        status: payout.status,
        requestedAt: payout.requestedAt,
        lines: payout.lines.map(line => ({
          component: line.component,
          amount: parseFloat(line.amountEur.toString())
        }))
      }
    })

  } catch (error) {
    console.error('Payout request error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Beantragen der Auszahlung' },
      { status: 500 }
    )
  }
}