'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, getCurrentPeriodId, formatPeriod } from '@/lib/utils'

interface DashboardData {
  kpis: {
    totalEarnings: number
    baseCommission: number
    activityCommission: number
    bonusTotal: number
    downlineTotal: number
    teamBonus: number
    creatorCount: number
    activeCreators: number
    totalDiamonds: number
    personalRevenueUsd: number
    milestoneAchievements: {
      m0_5: number
      m1: number
      m1_retention: number
      m2: number
    }
  }
  componentBreakdown: Record<string, number>
  creators: Array<{
    id: string
    handle: string
    diamonds: number
    revenue: number
    milestones: {
      m0_5: boolean
      m1: boolean
      m1_retention: boolean
      m2: boolean
    } | null
  }>
  downline: Array<{
    level: number
    levelName: string
    manager: {
      id: string
      name: string
      email: string
      role: string
    }
    personalRevenue: number
    commission: number
  }>
  payout: {
    id: string
    amount: number
    status: string
    requestedAt: string | null
    processedAt: string | null
    notes: string | null
    lines: Array<{
      component: string
      amount: number
    }>
  } | null
  payoutHistory: Array<{
    id: string
    period: string
    amount: number
    status: string
    requestedAt: string | null
    processedAt: string | null
  }>
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRequestingPayout, setIsRequestingPayout] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriodId())
  
  const currentPeriod = getCurrentPeriodId()

  useEffect(() => {
    fetchDashboardData()
  }, [selectedPeriod])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/dashboard?periodId=${selectedPeriod}`)
      if (response.ok) {
        const result = await response.json()
        setDashboardData(result.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestPayout = async () => {
    if (!dashboardData || dashboardData.kpis.totalEarnings <= 0) return

    setIsRequestingPayout(true)
    try {
      const response = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: selectedPeriod })
      })

      if (response.ok) {
        await fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('Error requesting payout:', error)
    } finally {
      setIsRequestingPayout(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lade Dashboard...</h1>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Fehler beim Laden</h1>
          <Button onClick={fetchDashboardData}>Erneut versuchen</Button>
        </div>
      </div>
    )
  }

  const { kpis, componentBreakdown, creators, downline, payout, payoutHistory } = dashboardData

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-gray-600">Willkommen, {session?.user?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={currentPeriod}>{formatPeriod(currentPeriod)}</option>
              </select>
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gesamteinkommen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.totalEarnings)}</div>
                <p className="text-xs text-muted-foreground">
                  Periode {formatPeriod(selectedPeriod)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Base Commission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.baseCommission)}</div>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.role === 'TEAM_LEADER' ? '35%' : '30%'} auf Base Revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Bonus Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.bonusTotal)}</div>
                <p className="text-xs text-muted-foreground">
                  Meilenstein-Boni
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Creator Anzahl
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.activeCreators}</div>
                <p className="text-xs text-muted-foreground">
                  von {kpis.creatorCount} gesamt
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional KPIs for Team Leaders */}
          {session?.user?.role === 'TEAM_LEADER' && (kpis.downlineTotal > 0 || kpis.teamBonus > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Downline Provisionen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(kpis.downlineTotal)}</div>
                  <p className="text-xs text-muted-foreground">
                    Level A/B/C Provisionen
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Team Bonus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(kpis.teamBonus)}</div>
                  <p className="text-xs text-muted-foreground">
                    Team-Ziel erreicht
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Personal Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(kpis.personalRevenueUsd, 'USD')}</div>
                  <p className="text-xs text-muted-foreground">
                    Base + Activity USD
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Commission Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Provisionsaufschlüsselung</CardTitle>
                <CardDescription>
                  Detaillierte Übersicht Ihrer Einkommen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Base Commission ({session?.user?.role === 'TEAM_LEADER' ? '35%' : '30%'})</span>
                    <span className="font-medium">{formatCurrency(kpis.baseCommission)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Activity Commission ({session?.user?.role === 'TEAM_LEADER' ? '35%' : '30%'})</span>
                    <span className="font-medium">{formatCurrency(kpis.activityCommission)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>M0.5 Boni ({kpis.milestoneAchievements.m0_5}x)</span>
                    <span className="font-medium">{formatCurrency(componentBreakdown['M0_5_BONUS'] || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>M1 Boni ({kpis.milestoneAchievements.m1}x)</span>
                    <span className="font-medium">{formatCurrency(componentBreakdown['M1_BONUS'] || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>M1 Retention Boni ({kpis.milestoneAchievements.m1_retention}x)</span>
                    <span className="font-medium">{formatCurrency(componentBreakdown['M1_RETENTION_BONUS'] || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>M2 Boni ({kpis.milestoneAchievements.m2}x)</span>
                    <span className="font-medium">{formatCurrency(componentBreakdown['M2_BONUS'] || 0)}</span>
                  </div>
                  {session?.user?.role === 'TEAM_LEADER' && (
                    <>
                      <hr />
                      <div className="flex justify-between">
                        <span>Downline Level A (10%)</span>
                        <span className="font-medium">{formatCurrency(componentBreakdown['DOWNLINE_A'] || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Downline Level B (7.5%)</span>
                        <span className="font-medium">{formatCurrency(componentBreakdown['DOWNLINE_B'] || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Downline Level C (5%)</span>
                        <span className="font-medium">{formatCurrency(componentBreakdown['DOWNLINE_C'] || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Team Bonus</span>
                        <span className="font-medium">{formatCurrency(componentBreakdown['TEAM_BONUS'] || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Team Recruitment</span>
                        <span className="font-medium">{formatCurrency(componentBreakdown['TEAM_RECRUITMENT'] || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Team Graduation</span>
                        <span className="font-medium">{formatCurrency(componentBreakdown['TEAM_GRADUATION'] || 0)}</span>
                      </div>
                    </>
                  )}
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Gesamt</span>
                    <span>{formatCurrency(kpis.totalEarnings)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payout Section */}
            <Card>
              <CardHeader>
                <CardTitle>Auszahlung</CardTitle>
                <CardDescription>
                  Beantragen Sie Ihre Auszahlung
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {formatCurrency(kpis.totalEarnings)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {payout ? `Status: ${getPayoutStatusText(payout.status)}` : 'Verfügbar für Auszahlung'}
                    </p>
                  </div>
                  
                  {!payout && kpis.totalEarnings > 0 ? (
                    <Button 
                      className="w-full"
                      onClick={handleRequestPayout}
                      disabled={isRequestingPayout}
                    >
                      {isRequestingPayout ? 'Beantrage...' : 'Auszahlung beantragen'}
                    </Button>
                  ) : payout ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <div className="font-medium">Status: {getPayoutStatusText(payout.status)}</div>
                        {payout.requestedAt && (
                          <div>Beantragt: {new Date(payout.requestedAt).toLocaleDateString('de-DE')}</div>
                        )}
                        {payout.processedAt && (
                          <div>Bearbeitet: {new Date(payout.processedAt).toLocaleDateString('de-DE')}</div>
                        )}
                        {payout.notes && (
                          <div>Notizen: {payout.notes}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      Keine Provisionen für Auszahlung verfügbar
                    </div>
                  )}
                  
                  {payoutHistory.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-2">Auszahlungshistorie:</p>
                      <div className="space-y-1">
                        {payoutHistory.map(p => (
                          <div key={p.id} className="flex justify-between">
                            <span>{formatPeriod(p.period)}</span>
                            <span>{formatCurrency(p.amount)} - {getPayoutStatusText(p.status)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Creator Performance */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Creator Performance</CardTitle>
              <CardDescription>
                Übersicht Ihrer Creator und deren Leistung
              </CardDescription>
            </CardHeader>
            <CardContent>
              {creators.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Handle</th>
                        <th className="text-right py-2">Diamonds</th>
                        <th className="text-right py-2">Revenue (USD)</th>
                        <th className="text-center py-2">M0.5</th>
                        <th className="text-center py-2">M1</th>
                        <th className="text-center py-2">M1 Ret</th>
                        <th className="text-center py-2">M2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creators.map(creator => (
                        <tr key={creator.id} className="border-b">
                          <td className="py-2 font-medium">{creator.handle}</td>
                          <td className="text-right py-2">{creator.diamonds.toLocaleString()}</td>
                          <td className="text-right py-2">{formatCurrency(creator.revenue, 'USD')}</td>
                          <td className="text-center py-2">{creator.milestones?.m0_5 ? '✓' : '-'}</td>
                          <td className="text-center py-2">{creator.milestones?.m1 ? '✓' : '-'}</td>
                          <td className="text-center py-2">{creator.milestones?.m1_retention ? '✓' : '-'}</td>
                          <td className="text-center py-2">{creator.milestones?.m2 ? '✓' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  Keine Creator-Daten für diese Periode
                </div>
              )}
            </CardContent>
          </Card>

          {/* Downline Performance for Team Leaders */}
          {session?.user?.role === 'TEAM_LEADER' && downline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Downline Performance</CardTitle>
                <CardDescription>
                  Übersicht Ihrer Team-Mitglieder und deren Beitrag
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Level</th>
                        <th className="text-left py-2">Manager</th>
                        <th className="text-right py-2">Personal Revenue (USD)</th>
                        <th className="text-right py-2">Ihre Provision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {downline.map((member, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 font-medium">Level {member.levelName}</td>
                          <td className="py-2">{member.manager.name}</td>
                          <td className="text-right py-2">{formatCurrency(member.personalRevenue, 'USD')}</td>
                          <td className="text-right py-2">{formatCurrency(member.commission)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

function getPayoutStatusText(status: string): string {
  switch (status) {
    case 'DRAFT': return 'Entwurf'
    case 'SUBMITTED': return 'Eingereicht'
    case 'IN_PROGRESS': return 'In Bearbeitung'
    case 'APPROVED': return 'Genehmigt'
    case 'PAID': return 'Ausgezahlt'
    case 'REJECTED': return 'Abgelehnt'
    default: return status
  }
}