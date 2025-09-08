import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ExchangeRateService } from '@/lib/exchange-rate-service'

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
    
    // Parse period ID (format: YYYYMM)
    if (!/^\d{6}$/.test(periodId)) {
      return NextResponse.json({ 
        error: 'Ungültiges Perioden-Format. Erwartet: YYYYMM' 
      }, { status: 400 })
    }
    
    const year = parseInt(periodId.substring(0, 4))
    const month = parseInt(periodId.substring(4, 6))
    
    if (month < 1 || month > 12) {
      return NextResponse.json({ 
        error: 'Ungültiger Monat. Muss zwischen 01 und 12 liegen.' 
      }, { status: 400 })
    }
    
    // Get exchange rate for this period
    const rateResult = await ExchangeRateService.getMonthlyRate(year, month)
    
    if (!rateResult.success) {
      return NextResponse.json({
        success: false,
        error: rateResult.error,
        fallbackRate: ExchangeRateService.getFallbackRate(),
        fallbackMessage: `Fallback-Rate verfügbar: ${ExchangeRateService.formatRate(ExchangeRateService.getFallbackRate())}`
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      period: {
        id: periodId,
        year,
        month,
        monthName: new Date(year, month - 1).toLocaleDateString('de-DE', { month: 'long' })
      },
      exchangeRate: {
        rate: rateResult.rate,
        formatted: ExchangeRateService.formatRate(rateResult.rate!),
        date: rateResult.date,
        source: rateResult.source
      },
      businessRule: 'Wechselkurs vom 6. des Monats um 12:00 Uhr mittags',
      ruleDate: `${String(6).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year} 12:00 Uhr`
    })

  } catch (error) {
    console.error('Exchange rate API error:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen des Wechselkurses',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}