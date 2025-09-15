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

    const ruleSet = await prisma.ruleSet.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        activeFrom: true,
        isActive: true
      }
    })

    return NextResponse.json({
      hasRuleSet: !!ruleSet,
      ruleSet: ruleSet
    })

  } catch (error) {
    console.error('Check rule set error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Überprüfen des Regel-Sets' },
      { status: 500 }
    )
  }
}