import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreatePeriodSchema = z.object({
  id: z.string().regex(/^\d{6}$/, 'ID muss im Format YYYYMM sein'),
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12),
  usdEurRate: z.number().min(0.1).max(2.0).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreatePeriodSchema.parse(body)

    // Check if period already exists
    const existingPeriod = await prisma.period.findUnique({
      where: { id: validatedData.id }
    })

    if (existingPeriod) {
      return NextResponse.json({ 
        error: 'Periode existiert bereits' 
      }, { status: 400 })
    }

    // Create period
    const period = await prisma.period.create({
      data: {
        id: validatedData.id,
        year: validatedData.year,
        month: validatedData.month,
        usdEurRate: validatedData.usdEurRate,
        status: 'ACTIVE'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Periode erfolgreich erstellt',
      period
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create period error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Periode' },
      { status: 500 }
    )
  }
}