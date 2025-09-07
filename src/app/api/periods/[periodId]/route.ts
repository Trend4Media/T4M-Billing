import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdatePeriodSchema = z.object({
  usdEurRate: z.number().min(0.1).max(2.0).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'LOCKED']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { periodId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = params

    const period = await prisma.period.findUnique({
      where: { id: periodId },
      include: {
        _count: {
          select: {
            revenueItems: true,
            commissions: true,
            payouts: true
          }
        }
      }
    })

    if (!period) {
      return NextResponse.json({ error: 'Periode nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ period })

  } catch (error) {
    console.error('Get period error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Periode' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { periodId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = params
    const body = await request.json()
    
    const validatedData = UpdatePeriodSchema.parse(body)

    // Check if period exists
    const existingPeriod = await prisma.period.findUnique({
      where: { id: periodId }
    })

    if (!existingPeriod) {
      return NextResponse.json({ error: 'Periode nicht gefunden' }, { status: 404 })
    }

    // Prevent changes to locked periods (except unlocking)
    if (existingPeriod.status === 'LOCKED' && validatedData.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Gesperrte Periode kann nur entsperrt werden' 
      }, { status: 400 })
    }

    // Update period
    const updatedPeriod = await prisma.period.update({
      where: { id: periodId },
      data: {
        ...validatedData,
        lockedAt: validatedData.status === 'LOCKED' ? new Date() : null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Periode erfolgreich aktualisiert',
      period: updatedPeriod
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update period error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Periode' },
      { status: 500 }
    )
  }
}