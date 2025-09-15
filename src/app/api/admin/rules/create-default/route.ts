import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_RULE_SET } from '@/lib/default-rules'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if there's already an active rule set
    const existingRuleSet = await prisma.ruleSet.findFirst({
      where: { isActive: true }
    })

    if (existingRuleSet) {
      return NextResponse.json({
        success: true,
        message: 'Aktives Regel-Set bereits vorhanden',
        ruleSetId: existingRuleSet.id
      })
    }

    // Create new rule set with default values
    const ruleSet = await prisma.ruleSet.create({
      data: {
        jsonRules: DEFAULT_RULE_SET,
        activeFrom: new Date(),
        isActive: true
      }
    })

    console.log('✅ Default rule set created:', ruleSet.id)

    return NextResponse.json({
      success: true,
      message: 'Standard-Regel-Set erstellt',
      ruleSetId: ruleSet.id,
      rules: DEFAULT_RULE_SET
    })

  } catch (error) {
    console.error('Create default rules error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Standard-Regel-Sets' },
      { status: 500 }
    )
  }
}