'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, getCurrentPeriodId, formatPeriod } from '@/lib/utils'

interface Payout {
  id: string
  period: {
    id: string
    year: number
    month: number
  }
  manager: {
    id: string
    name: string
    email: string
    role: string
  }
  amountEur: number
  status: string
  requestedAt: string | null
  processedAt: string | null
  notes: string | null
  lines: Array<{
    component: string
    amountEur: number
  }>
}

export default function PayoutsPage() {
  const { data: session } = useSession()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [notes, setNotes] = useState('')
  
  const currentPeriod = getCurrentPeriodId()

  useEffect(() => {
    fetchPayouts()
  }, [])

  const fetchPayouts = async () => {
    try {
      const response = await fetch('/api/admin/payouts')
      if (response.ok) {
        const data = await response.json()
        setPayouts(data.payouts)
      }
    } catch (error) {
      console.error('Error fetching payouts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePayoutStatus = async (payoutId: string, status: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      })

      if (response.ok) {
        await fetchPayouts()
        setSelectedPayout(null)
        setNotes('')
      }
    } catch (error) {
      console.error('Error updating payout:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'text-yellow-600 bg-yellow-50'
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50'
      case 'APPROVED': return 'text-green-600 bg-green-50'
      case 'PAID': return 'text-green-800 bg-green-100'
      case 'REJECTED': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'Eingereicht'
      case 'IN_PROGRESS': return 'In Bearbeitung'
      case 'APPROVED': return 'Genehmigt'
      case 'PAID': return 'Ausgezahlt'
      case 'REJECTED': return 'Abgelehnt'
      default: return status
    }
  }

  const pendingPayouts = payouts.filter(p => ['SUBMITTED', 'IN_PROGRESS'].includes(p.status))
  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amountEur, 0)

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
              <h1 className="text-3xl font-bold text-gray-900">Auszahlungen</h1>
              <p className="text-gray-600">Verwaltung der Manager-Auszahlungen</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Periode: {formatPeriod(currentPeriod)}
              </span>
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
              className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600"
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
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Offene Auszahlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingPayouts.length}</div>
                <p className="text-xs text-muted-foreground">
                  Zu genehmigen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ausstehender Betrag
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalPendingAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  Gesamt offen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Alle Auszahlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{payouts.length}</div>
                <p className="text-xs text-muted-foreground">
                  Gesamt
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payouts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Auszahlungsübersicht</CardTitle>
              <CardDescription>
                Alle Auszahlungsanträge und deren Status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Periode</th>
                        <th className="text-left py-2">Manager</th>
                        <th className="text-left py-2">Rolle</th>
                        <th className="text-right py-2">Betrag</th>
                        <th className="text-center py-2">Status</th>
                        <th className="text-center py-2">Beantragt</th>
                        <th className="text-center py-2">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map(payout => (
                        <tr key={payout.id} className="border-b">
                          <td className="py-2">{formatPeriod(payout.period.id)}</td>
                          <td className="py-2">
                            <div>
                              <div className="font-medium">{payout.manager.name}</div>
                              <div className="text-gray-500 text-xs">{payout.manager.email}</div>
                            </div>
                          </td>
                          <td className="py-2">
                            {payout.manager.role === 'TEAM_LEADER' ? 'Team Leader' : 'Live Manager'}
                          </td>
                          <td className="text-right py-2 font-medium">{formatCurrency(payout.amountEur)}</td>
                          <td className="text-center py-2">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(payout.status)}`}>
                              {getStatusText(payout.status)}
                            </span>
                          </td>
                          <td className="text-center py-2 text-xs text-gray-500">
                            {payout.requestedAt ? new Date(payout.requestedAt).toLocaleDateString('de-DE') : '-'}
                          </td>
                          <td className="text-center py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPayout(payout)}
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  Keine Auszahlungen vorhanden
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout Detail Modal */}
          {selectedPayout && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Auszahlungsdetails</h2>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedPayout(null)}
                    >
                      Schließen
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Manager</div>
                        <div>{selectedPayout.manager.name}</div>
                        <div className="text-gray-500">{selectedPayout.manager.email}</div>
                      </div>
                      <div>
                        <div className="font-medium">Periode</div>
                        <div>{formatPeriod(selectedPayout.period.id)}</div>
                      </div>
                      <div>
                        <div className="font-medium">Betrag</div>
                        <div className="text-lg font-bold">{formatCurrency(selectedPayout.amountEur)}</div>
                      </div>
                      <div>
                        <div className="font-medium">Status</div>
                        <div className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(selectedPayout.status)}`}>
                          {getStatusText(selectedPayout.status)}
                        </div>
                      </div>
                    </div>

                    {selectedPayout.notes && (
                      <div>
                        <div className="font-medium">Notizen</div>
                        <div className="text-sm text-gray-600">{selectedPayout.notes}</div>
                      </div>
                    )}

                    <div>
                      <div className="font-medium mb-2">Komponenten</div>
                      <div className="space-y-1 text-sm">
                        {selectedPayout.lines.map((line, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{getComponentName(line.component)}</span>
                            <span>{formatCurrency(line.amountEur)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {['SUBMITTED', 'IN_PROGRESS'].includes(selectedPayout.status) && (
                      <div className="space-y-4 pt-4 border-t">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Notizen (optional)
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-2 border rounded text-sm"
                            rows={3}
                            placeholder="Notizen zur Auszahlung..."
                          />
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleUpdatePayoutStatus(selectedPayout.id, 'IN_PROGRESS')}
                            disabled={isProcessing}
                            variant="outline"
                          >
                            In Bearbeitung
                          </Button>
                          <Button
                            onClick={() => handleUpdatePayoutStatus(selectedPayout.id, 'APPROVED')}
                            disabled={isProcessing}
                          >
                            Genehmigen
                          </Button>
                          <Button
                            onClick={() => handleUpdatePayoutStatus(selectedPayout.id, 'PAID')}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Als bezahlt markieren
                          </Button>
                          <Button
                            onClick={() => handleUpdatePayoutStatus(selectedPayout.id, 'REJECTED')}
                            disabled={isProcessing}
                            variant="destructive"
                          >
                            Ablehnen
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function getComponentName(component: string): string {
  switch (component) {
    case 'BASE_COMMISSION': return 'Base Commission'
    case 'ACTIVITY_COMMISSION': return 'Activity Commission'
    case 'M0_5_BONUS': return 'M0.5 Bonus'
    case 'M1_BONUS': return 'M1 Bonus'
    case 'M1_RETENTION_BONUS': return 'M1 Retention Bonus'
    case 'M2_BONUS': return 'M2 Bonus'
    case 'DOWNLINE_A': return 'Downline Level A'
    case 'DOWNLINE_B': return 'Downline Level B'
    case 'DOWNLINE_C': return 'Downline Level C'
    case 'TEAM_BONUS': return 'Team Bonus'
    case 'TEAM_RECRUITMENT': return 'Team Recruitment'
    case 'TEAM_GRADUATION': return 'Team Graduation'
    default: return component
  }
}