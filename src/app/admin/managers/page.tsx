'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, getCurrentPeriodId, formatPeriod } from '@/lib/utils'

interface ManagerOverview {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
  stats: {
    creatorCount: number
    totalRevenue: number
    totalCommissions: number
    totalDiamonds: number
    payoutStatus: string | null
  }
}

export default function ManagersPage() {
  const { data: session } = useSession()
  const [managers, setManagers] = useState<ManagerOverview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriodId())
  const [isExporting, setIsExporting] = useState(false)
  
  const currentPeriod = getCurrentPeriodId()

  useEffect(() => {
    fetchManagers()
  }, [selectedPeriod])

  const fetchManagers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/managers?periodId=${selectedPeriod}`)
      if (response.ok) {
        const data = await response.json()
        setManagers(data.managers)
      }
    } catch (error) {
      console.error('Error fetching managers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(`/api/admin/export/${selectedPeriod}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Trend4Media_Billing_${formatPeriod(selectedPeriod)}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const totalStats = managers.reduce((acc, manager) => ({
    totalRevenue: acc.totalRevenue + manager.stats.totalRevenue,
    totalCommissions: acc.totalCommissions + manager.stats.totalCommissions,
    totalCreators: acc.totalCreators + manager.stats.creatorCount,
    totalDiamonds: acc.totalDiamonds + manager.stats.totalDiamonds
  }), { totalRevenue: 0, totalCommissions: 0, totalCreators: 0, totalDiamonds: 0 })

  const activeManagers = managers.filter(m => m.active)
  const managersWithRevenue = managers.filter(m => m.stats.totalRevenue > 0)

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Lade...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manager Übersicht</h1>
              <p className="text-gray-600">Übersicht aller Manager und deren Performance</p>
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
                onClick={handleExport}
                disabled={isExporting}
                variant="outline"
              >
                {isExporting ? 'Exportiere...' : 'Excel Export'}
              </Button>
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

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/admin"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Übersicht
            </Link>
            <Link
              href="/admin/imports"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Imports
            </Link>
            <Link
              href="/admin/payouts"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Auszahlungen
            </Link>
            <Link
              href="/admin/periods"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Perioden
            </Link>
            <Link
              href="/admin/genealogy"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Genealogy
            </Link>
            <Link
              href="/admin/managers"
              className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600"
            >
              Manager
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Aktive Manager
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeManagers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {managersWithRevenue.length} mit Umsatz
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gesamtumsatz
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalStats.totalRevenue, 'USD')}</div>
                <p className="text-xs text-muted-foreground">
                  Periode {formatPeriod(selectedPeriod)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gesamtprovisionen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalStats.totalCommissions)}</div>
                <p className="text-xs text-muted-foreground">
                  Zu zahlen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Creator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.totalCreators}</div>
                <p className="text-xs text-muted-foreground">
                  {totalStats.totalDiamonds.toLocaleString()} Diamonds
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Managers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Manager Performance</CardTitle>
              <CardDescription>
                Detaillierte Übersicht aller Manager für Periode {formatPeriod(selectedPeriod)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {managers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Manager</th>
                        <th className="text-left py-2">Rolle</th>
                        <th className="text-center py-2">Status</th>
                        <th className="text-right py-2">Creator</th>
                        <th className="text-right py-2">Diamonds</th>
                        <th className="text-right py-2">Revenue (USD)</th>
                        <th className="text-right py-2">Provisionen (EUR)</th>
                        <th className="text-center py-2">Payout Status</th>
                        <th className="text-center py-2">Mitglied seit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managers.map(manager => (
                        <tr key={manager.id} className="border-b">
                          <td className="py-2">
                            <div>
                              <div className="font-medium">{manager.name}</div>
                              <div className="text-gray-500 text-xs">{manager.email}</div>
                            </div>
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              manager.role === 'TEAM_LEADER' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {manager.role === 'TEAM_LEADER' ? 'Team Leader' : 'Live Manager'}
                            </span>
                          </td>
                          <td className="text-center py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              manager.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {manager.active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </td>
                          <td className="text-right py-2">{manager.stats.creatorCount}</td>
                          <td className="text-right py-2">{manager.stats.totalDiamonds.toLocaleString()}</td>
                          <td className="text-right py-2 font-medium">
                            {formatCurrency(manager.stats.totalRevenue, 'USD')}
                          </td>
                          <td className="text-right py-2 font-medium">
                            {formatCurrency(manager.stats.totalCommissions)}
                          </td>
                          <td className="text-center py-2">
                            {manager.stats.payoutStatus ? (
                              <span className={`px-2 py-1 rounded text-xs ${getPayoutStatusColor(manager.stats.payoutStatus)}`}>
                                {getPayoutStatusText(manager.stats.payoutStatus)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="text-center py-2 text-xs text-gray-500">
                            {new Date(manager.createdAt).toLocaleDateString('de-DE')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  Keine Manager-Daten gefunden
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function getPayoutStatusColor(status: string): string {
  switch (status) {
    case 'SUBMITTED': return 'bg-yellow-100 text-yellow-800'
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
    case 'APPROVED': return 'bg-green-100 text-green-800'
    case 'PAID': return 'bg-green-200 text-green-900'
    case 'REJECTED': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getPayoutStatusText(status: string): string {
  switch (status) {
    case 'SUBMITTED': return 'Eingereicht'
    case 'IN_PROGRESS': return 'In Bearbeitung'
    case 'APPROVED': return 'Genehmigt'
    case 'PAID': return 'Ausgezahlt'
    case 'REJECTED': return 'Abgelehnt'
    default: return status
  }
}