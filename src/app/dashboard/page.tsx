'use client'

import { useSession, signOut } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, getCurrentPeriodId, formatPeriod } from '@/lib/utils'

export default function DashboardPage() {
  const { data: session } = useSession()
  
  const currentPeriod = getCurrentPeriodId()

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
                  Aktueller Monat
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
                  30% auf Base Revenue
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

          {/* Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
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
                    <span>Base Commission (30%)</span>
                    <span className="font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Activity Commission (30%)</span>
                    <span className="font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>M0.5 Boni</span>
                    <span className="font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>M1 Boni</span>
                    <span className="font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>M1 Retention Boni</span>
                    <span className="font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>M2 Boni</span>
                    <span className="font-medium">{formatCurrency(0)}</span>
                  </div>
                  {session?.user?.role === 'TEAM_LEADER' && (
                    <>
                      <hr />
                      <div className="flex justify-between">
                        <span>Downline Level A (10%)</span>
                        <span className="font-medium">{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Downline Level B (7.5%)</span>
                        <span className="font-medium">{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Downline Level C (5%)</span>
                        <span className="font-medium">{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Team Bonus</span>
                        <span className="font-medium">{formatCurrency(0)}</span>
                      </div>
                    </>
                  )}
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Gesamt</span>
                    <span>{formatCurrency(0)}</span>
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
                      {formatCurrency(0)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Verfügbar für Auszahlung
                    </p>
                  </div>
                  
                  <Button className="w-full" disabled>
                    Auszahlung beantragen
                  </Button>
                  
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">Auszahlungshistorie:</p>
                    <p className="text-gray-500 italic">Keine Auszahlungen vorhanden</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}