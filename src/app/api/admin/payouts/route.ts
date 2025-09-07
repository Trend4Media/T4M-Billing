import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('periodId')
    const status = searchParams.get('status')

    const whereClause: any = {}
    if (periodId) whereClause.periodId = periodId
    if (status) whereClause.status = status

    const payouts = await prisma.payout.findMany({
      where: whereClause,
      include: {
        period: {
          select: {
            id: true,
            year: true,
            month: true
          }
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        lines: {
          select: {
            component: true,
            amountEur: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { requestedAt: 'desc' }
      ]
    })

    const formattedPayouts = payouts.map(payout => ({
      ...payout,
      amountEur: parseFloat(payout.amountEur.toString()),
      lines: payout.lines.map(line => ({
        ...line,
        amountEur: parseFloat(line.amountEur.toString())
      }))
    }))

    return NextResponse.json({
      success: true,
      payouts: formattedPayouts
    })

  } catch (error) {
    console.error('Get payouts error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Auszahlungen' },
      { status: 500 }
    )
  }
}