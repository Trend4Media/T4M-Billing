import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { formatPeriod } from '@/lib/utils'

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
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'xlsx'

    // Get period info
    const period = await prisma.period.findUnique({
      where: { id: periodId }
    })

    if (!period) {
      return NextResponse.json({ error: 'Periode nicht gefunden' }, { status: 404 })
    }

    // Get comprehensive export data
    const exportData = await generateExportData(periodId)

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        period: {
          id: period.id,
          year: period.year,
          month: period.month,
          usdEurRate: period.usdEurRate,
          status: period.status
        },
        data: exportData
      })
    }

    // Generate Excel file
    const workbook = createExcelWorkbook(exportData, period)
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const filename = `Trend4Media_Billing_${formatPeriod(periodId)}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Exports' },
      { status: 500 }
    )
  }
}

async function generateExportData(periodId: string) {
  // Get all managers with their data for the period
  const managers = await prisma.user.findMany({
    where: {
      role: { in: ['TEAM_LEADER', 'SALES_REP'] },
      active: true
    },
    include: {
      revenueItems: {
        where: { periodId },
        include: {
          creator: {
            select: {
              handle: true
            }
          }
        }
      },
      commissions: {
        where: { periodId },
        orderBy: { component: 'asc' }
      }
    }
  })

  // Transform data for export
  const managerSummaries = managers.map(manager => {
    // Calculate personal revenue
    const personalRevenue = {
      baseUsd: 0,
      activityUsd: 0,
      totalUsd: 0,
      diamonds: 0,
      creatorCount: manager.revenueItems.length,
      milestones: {
        m0_5: 0,
        m1: 0,
        m1_retention: 0,
        m2: 0
      }
    }

    manager.revenueItems.forEach(item => {
      personalRevenue.baseUsd += parseFloat(item.estBaseUsd.toString())
      personalRevenue.activityUsd += parseFloat(item.estActivityUsd.toString())
      personalRevenue.diamonds += item.diamonds
      
      if (item.m0_5) personalRevenue.milestones.m0_5++
      if (item.m1) personalRevenue.milestones.m1++
      if (item.m1Retention) personalRevenue.milestones.m1_retention++
      if (item.m2) personalRevenue.milestones.m2++
    })
    personalRevenue.totalUsd = personalRevenue.baseUsd + personalRevenue.activityUsd

    // Group commissions by component
    const commissionsByComponent: Record<string, number> = {}
    let totalCommissionEur = 0

    manager.commissions.forEach(commission => {
      const amount = parseFloat(commission.amountEur.toString())
      commissionsByComponent[commission.component] = (commissionsByComponent[commission.component] || 0) + amount
      totalCommissionEur += amount
    })

    return {
      managerId: manager.id,
      managerName: manager.name,
      managerEmail: manager.email,
      role: manager.role,
      personalRevenue,
      commissions: commissionsByComponent,
      totalCommissionEur,
      creators: manager.revenueItems.map(item => ({
        handle: item.creator.handle,
        diamonds: item.diamonds,
        baseUsd: parseFloat(item.estBaseUsd.toString()),
        activityUsd: parseFloat(item.estActivityUsd.toString()),
        milestones: {
          m0_5: item.m0_5,
          m1: item.m1,
          m1_retention: item.m1Retention,
          m2: item.m2
        }
      }))
    }
  }).filter(manager => manager.personalRevenue.creatorCount > 0) // Only include managers with revenue

  return {
    managerSummaries,
    totals: {
      totalManagers: managerSummaries.length,
      totalRevenue: managerSummaries.reduce((sum, m) => sum + m.personalRevenue.totalUsd, 0),
      totalCommissions: managerSummaries.reduce((sum, m) => sum + m.totalCommissionEur, 0),
      totalCreators: managerSummaries.reduce((sum, m) => sum + m.personalRevenue.creatorCount, 0),
      totalDiamonds: managerSummaries.reduce((sum, m) => sum + m.personalRevenue.diamonds, 0)
    }
  }
}

function createExcelWorkbook(exportData: any, period: any) {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Manager Summary
  const managerSummaryData = [
    [
      'Manager Name', 'Email', 'Role', 'Creator Count', 'Total Diamonds',
      'Base Revenue (USD)', 'Activity Revenue (USD)', 'Total Revenue (USD)',
      'Base Commission (EUR)', 'Activity Commission (EUR)', 'M0.5 Bonuses (EUR)',
      'M1 Bonuses (EUR)', 'M1 Retention Bonuses (EUR)', 'M2 Bonuses (EUR)',
      'Downline A (EUR)', 'Downline B (EUR)', 'Downline C (EUR)',
      'Team Bonus (EUR)', 'Team Recruitment (EUR)', 'Team Graduation (EUR)',
      'Total Commission (EUR)'
    ]
  ]

  exportData.managerSummaries.forEach((manager: any) => {
    managerSummaryData.push([
      manager.managerName,
      manager.managerEmail,
      manager.role === 'TEAM_LEADER' ? 'Team Leader' : 'Live Manager',
      manager.personalRevenue.creatorCount,
      manager.personalRevenue.diamonds,
      manager.personalRevenue.baseUsd.toFixed(2),
      manager.personalRevenue.activityUsd.toFixed(2),
      manager.personalRevenue.totalUsd.toFixed(2),
      (manager.commissions['BASE_COMMISSION'] || 0).toFixed(2),
      (manager.commissions['ACTIVITY_COMMISSION'] || 0).toFixed(2),
      (manager.commissions['M0_5_BONUS'] || 0).toFixed(2),
      (manager.commissions['M1_BONUS'] || 0).toFixed(2),
      (manager.commissions['M1_RETENTION_BONUS'] || 0).toFixed(2),
      (manager.commissions['M2_BONUS'] || 0).toFixed(2),
      (manager.commissions['DOWNLINE_A'] || 0).toFixed(2),
      (manager.commissions['DOWNLINE_B'] || 0).toFixed(2),
      (manager.commissions['DOWNLINE_C'] || 0).toFixed(2),
      (manager.commissions['TEAM_BONUS'] || 0).toFixed(2),
      (manager.commissions['TEAM_RECRUITMENT'] || 0).toFixed(2),
      (manager.commissions['TEAM_GRADUATION'] || 0).toFixed(2),
      manager.totalCommissionEur.toFixed(2)
    ])
  })

  const managerSummarySheet = XLSX.utils.aoa_to_sheet(managerSummaryData)
  XLSX.utils.book_append_sheet(workbook, managerSummarySheet, 'Manager Summary')

  // Sheet 2: Creator Details
  const creatorDetailsData = [
    [
      'Manager Name', 'Manager Email', 'Creator Handle', 'Diamonds',
      'Base Revenue (USD)', 'Activity Revenue (USD)', 'Total Revenue (USD)',
      'M0.5', 'M1', 'M1 Retention', 'M2'
    ]
  ]

  exportData.managerSummaries.forEach((manager: any) => {
    manager.creators.forEach((creator: any) => {
      creatorDetailsData.push([
        manager.managerName,
        manager.managerEmail,
        creator.handle,
        creator.diamonds,
        creator.baseUsd.toFixed(2),
        creator.activityUsd.toFixed(2),
        (creator.baseUsd + creator.activityUsd).toFixed(2),
        creator.milestones.m0_5 ? 'Yes' : 'No',
        creator.milestones.m1 ? 'Yes' : 'No',
        creator.milestones.m1_retention ? 'Yes' : 'No',
        creator.milestones.m2 ? 'Yes' : 'No'
      ])
    })
  })

  const creatorDetailsSheet = XLSX.utils.aoa_to_sheet(creatorDetailsData)
  XLSX.utils.book_append_sheet(workbook, creatorDetailsSheet, 'Creator Details')

  // Sheet 3: Commission Ledger
  const commissionLedgerData = [
    [
      'Manager Name', 'Manager Email', 'Component Type', 'Amount USD', 'Amount EUR'
    ]
  ]

  exportData.managerSummaries.forEach((manager: any) => {
    Object.entries(manager.commissions).forEach(([component, amount]: [string, any]) => {
      if (amount > 0) {
        commissionLedgerData.push([
          manager.managerName,
          manager.managerEmail,
          getComponentDisplayName(component),
          '', // USD amount not available in summary
          amount.toFixed(2)
        ])
      }
    })
  })

  const commissionLedgerSheet = XLSX.utils.aoa_to_sheet(commissionLedgerData)
  XLSX.utils.book_append_sheet(workbook, commissionLedgerSheet, 'Commission Ledger')

  // Sheet 4: Summary
  const summaryData = [
    ['Trend4Media Billing Export'],
    [''],
    ['Period:', formatPeriod(period.id)],
    ['USD/EUR Rate:', period.usdEurRate?.toString() || 'Not set'],
    ['Export Date:', new Date().toLocaleDateString('de-DE')],
    [''],
    ['Totals:'],
    ['Total Managers:', exportData.totals.totalManagers],
    ['Total Creators:', exportData.totals.totalCreators],
    ['Total Diamonds:', exportData.totals.totalDiamonds.toLocaleString()],
    ['Total Revenue (USD):', exportData.totals.totalRevenue.toFixed(2)],
    ['Total Commissions (EUR):', exportData.totals.totalCommissions.toFixed(2)]
  ]

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  return workbook
}

function getComponentDisplayName(component: string): string {
  const names: Record<string, string> = {
    'BASE_COMMISSION': 'Base Commission',
    'ACTIVITY_COMMISSION': 'Activity Commission',
    'M0_5_BONUS': 'M0.5 Bonus',
    'M1_BONUS': 'M1 Bonus',
    'M1_RETENTION_BONUS': 'M1 Retention Bonus',
    'M2_BONUS': 'M2 Bonus',
    'DOWNLINE_A': 'Downline Level A',
    'DOWNLINE_B': 'Downline Level B',
    'DOWNLINE_C': 'Downline Level C',
    'TEAM_BONUS': 'Team Bonus',
    'TEAM_RECRUITMENT': 'Team Recruitment',
    'TEAM_GRADUATION': 'Team Graduation'
  }
  return names[component] || component
}