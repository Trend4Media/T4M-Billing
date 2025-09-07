import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdatePayoutSchema = z.object({
  status: z.enum(['SUBMITTED', 'IN_PROGRESS', 'APPROVED', 'PAID', 'REJECTED']),
  notes: z.string().optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { payoutId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { payoutId } = params
    const body = await request.json()
    
    const validatedData = UpdatePayoutSchema.parse(body)

    // Check if payout exists
    const existingPayout = await prisma.payout.findUnique({
      where: { id: payoutId }
    })

    if (!existingPayout) {
      return NextResponse.json({ error: 'Auszahlung nicht gefunden' }, { status: 404 })
    }

    // Update payout
    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: validatedData.status,
        notes: validatedData.notes,
        processedAt: ['APPROVED', 'PAID', 'REJECTED'].includes(validatedData.status) ? new Date() : null
      },
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
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Auszahlung erfolgreich aktualisiert',
      payout: {
        ...updatedPayout,
        amountEur: parseFloat(updatedPayout.amountEur.toString()),
        lines: updatedPayout.lines.map(line => ({
          ...line,
          amountEur: parseFloat(line.amountEur.toString())
        }))
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update payout error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Auszahlung' },
      { status: 500 }
    )
  }
}