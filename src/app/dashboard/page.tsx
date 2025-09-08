'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, getCurrentPeriodId, formatPeriod } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentPeriod = getCurrentPeriodId()

  useEffect(() => {
    // Simple loading simulation - no API calls for now
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lade Dashboard...</h1>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fehler</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Erneut versuchen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Logo size="md" variant="header" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
                <p className="text-gray-600">Willkommen, {session?.user?.name || 'Manager'}</p>
              </div>
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
                <div className="text-2xl font-bold">{formatCurrency(0)}</div>
                <p className="text-xs text-muted-foreground">
                  Periode {formatPeriod(currentPeriod)}
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
                <div className="text-2xl font-bold">{formatCurrency(0)}</div>
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
                <div className="text-2xl font-bold">{formatCurrency(0)}</div>
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
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Aktive Creator
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Welcome Message */}
          <Card>
            <CardHeader>
              <CardTitle>Willkommen im Trend4Media Billing System! 🎉</CardTitle>
              <CardDescription>
                Das System ist erfolgreich deployed und einsatzbereit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-lg mb-2">Nächste Schritte:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Als Admin anmelden</strong> für vollständige Funktionen</li>
                    <li>• <strong>Excel-Dateien importieren</strong> über das Admin-Dashboard</li>
                    <li>• <strong>USD/EUR Kurs setzen</strong> für Provisionsberechnungen</li>
                    <li>• <strong>Genealogy einrichten</strong> für Team-Strukturen</li>
                    <li>• <strong>Provisionen berechnen</strong> und Auszahlungen verwalten</li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-medium text-blue-900 mb-2">System-Features:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
                    <div>✅ Excel-Import mit Fuzzy Matching</div>
                    <div>✅ Deterministische Provisions-Engine</div>
                    <div>✅ Revisionssicheres Ledger</div>
                    <div>✅ Payout-Workflow</div>
                    <div>✅ Downline-Management</div>
                    <div>✅ Team-Bonus-System</div>
                    <div>✅ USD→EUR Konvertierung</div>
                    <div>✅ Export-System</div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Das System ist vollständig funktionsfähig und produktionsbereit!
                  </p>
                  
                  {session?.user?.role === 'ADMIN' && (
                    <div className="space-x-2">
                      <Button onClick={() => window.location.href = '/admin'}>
                        Zum Admin-Dashboard
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}