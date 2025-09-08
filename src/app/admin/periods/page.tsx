'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrentPeriodId, formatPeriod } from '@/lib/utils'

interface Period {
  id: string
  year: number
  month: number
  usdEurRate: number | null
  status: 'DRAFT' | 'ACTIVE' | 'LOCKED'
  lockedAt: string | null
  _count: {
    revenueItems: number
    commissions: number
    payouts: number
  }
}

export default function PeriodsPage() {
  const { data: session } = useSession()
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [usdEurRate, setUsdEurRate] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isFetchingRate, setIsFetchingRate] = useState(false)
  
  const currentPeriodId = getCurrentPeriodId()

  useEffect(() => {
    fetchPeriod()
  }, [])

  const fetchPeriod = async () => {
    try {
      const response = await fetch(`/api/periods/${currentPeriodId}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentPeriod(data.period)
        setUsdEurRate(data.period.usdEurRate?.toString() || '')
      } else {
        // Period doesn't exist, create it
        await createCurrentPeriod()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Laden der Periode' })
    } finally {
      setIsLoading(false)
    }
  }

  const createCurrentPeriod = async () => {
    try {
      const now = new Date()
      const response = await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentPeriodId,
          year: now.getFullYear(),
          month: now.getMonth() + 1
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentPeriod(data.period)
      }
    } catch (error) {
      console.error('Error creating period:', error)
    }
  }

  const handleUpdateRate = async () => {
    if (!currentPeriod || !usdEurRate) return

    setIsUpdating(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/periods/${currentPeriod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usdEurRate: parseFloat(usdEurRate)
        })
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentPeriod(data.period)
        setMessage({ type: 'success', text: 'USD/EUR Kurs erfolgreich gesetzt' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler beim Setzen des Kurses' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Setzen des Kurses' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLockPeriod = async () => {
    if (!currentPeriod) return

    setIsUpdating(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/periods/${currentPeriod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'LOCKED'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentPeriod(data.period)
        setMessage({ type: 'success', text: 'Periode erfolgreich gesperrt' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler beim Sperren der Periode' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Sperren der Periode' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUnlockPeriod = async () => {
    if (!currentPeriod) return

    setIsUpdating(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/periods/${currentPeriod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ACTIVE'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentPeriod(data.period)
        setMessage({ type: 'success', text: 'Periode erfolgreich entsperrt' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler beim Entsperren der Periode' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Entsperren der Periode' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRecalculate = async () => {
    if (!currentPeriod) return

    setIsRecalculating(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/periods/${currentPeriod.id}/recalculate`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Provisionen erfolgreich berechnet: ${data.summary.totalManagers} Manager, ${data.summary.totalCommissionEur.toFixed(2)}€ Gesamtprovisionen` 
        })
        // Refresh period data
        fetchPeriod()
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler bei der Provisionsberechnung' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler bei der Provisionsberechnung' })
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleFetchExchangeRate = async () => {
    if (!currentPeriod) return

    setIsFetchingRate(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/exchange-rate/${currentPeriod.id}`)
      const data = await response.json()

      if (response.ok) {
        setUsdEurRate(data.exchangeRate.rate.toString())
        setMessage({ 
          type: 'success', 
          text: `Wechselkurs automatisch abgerufen: ${data.exchangeRate.formatted} (${data.ruleDate})` 
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler beim Abrufen des Wechselkurses' })
        
        // Show fallback rate option
        if (data.fallbackRate) {
          setUsdEurRate(data.fallbackRate.toString())
          setMessage({ 
            type: 'error', 
            text: `${data.error} - Fallback-Rate gesetzt: ${data.fallbackMessage}` 
          })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Abrufen des Wechselkurses' })
    } finally {
      setIsFetchingRate(false)
    }
  }

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
              <h1 className="text-3xl font-bold text-gray-900">Perioden-Management</h1>
              <p className="text-gray-600">USD/EUR Kurse setzen und Perioden verwalten</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Aktuelle Periode: {formatPeriod(currentPeriodId)}
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
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Auszahlungen
            </Link>
            <Link
              href="/admin/periods"
              className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600"
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
          
          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message.text}
            </div>
          )}

          {currentPeriod && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Period Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Periode {formatPeriod(currentPeriod.id)}</CardTitle>
                  <CardDescription>
                    Status und Übersicht der aktuellen Abrechnungsperiode
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Status</div>
                      <div className={`font-medium ${
                        currentPeriod.status === 'LOCKED' ? 'text-red-600' :
                        currentPeriod.status === 'ACTIVE' ? 'text-green-600' :
                        'text-gray-600'
                      }`}>
                        {currentPeriod.status === 'LOCKED' ? 'Gesperrt' :
                         currentPeriod.status === 'ACTIVE' ? 'Aktiv' : 'Entwurf'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">USD/EUR Kurs</div>
                      <div>{currentPeriod.usdEurRate ? parseFloat(currentPeriod.usdEurRate.toString()).toFixed(6) : 'Nicht gesetzt'}</div>
                    </div>
                    <div>
                      <div className="font-medium">Revenue Items</div>
                      <div>{currentPeriod._count.revenueItems}</div>
                    </div>
                    <div>
                      <div className="font-medium">Provisionen berechnet</div>
                      <div>{currentPeriod._count.commissions > 0 ? 'Ja' : 'Nein'}</div>
                    </div>
                  </div>

                  {currentPeriod.lockedAt && (
                    <div className="text-sm text-gray-600">
                      Gesperrt am: {new Date(currentPeriod.lockedAt).toLocaleString('de-DE')}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {currentPeriod.status === 'LOCKED' ? (
                      <Button
                        onClick={handleUnlockPeriod}
                        disabled={isUpdating}
                        variant="outline"
                      >
                        {isUpdating ? 'Entsperre...' : 'Periode entsperren'}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleLockPeriod}
                        disabled={isUpdating || !currentPeriod.usdEurRate}
                        variant="destructive"
                      >
                        {isUpdating ? 'Sperre...' : 'Periode sperren'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* USD/EUR Rate Management */}
              <Card>
                <CardHeader>
                  <CardTitle>USD/EUR Wechselkurs</CardTitle>
                  <CardDescription>
                    Fixieren Sie den Wechselkurs für diese Periode
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate">Wechselkurs (USD zu EUR)</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.000001"
                      min="0.1"
                      max="2.0"
                      value={usdEurRate}
                      onChange={(e) => setUsdEurRate(e.target.value)}
                      placeholder="z.B. 0.920000"
                      disabled={currentPeriod.status === 'LOCKED'}
                    />
                    <div className="text-sm text-gray-600">
                      Beispiel: 0.92 bedeutet 1 USD = 0.92 EUR
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={handleFetchExchangeRate}
                      disabled={isFetchingRate || currentPeriod.status === 'LOCKED'}
                      variant="outline"
                      className="w-full"
                    >
                      {isFetchingRate ? 'Lade Kurs...' : 'Kurs vom 6. des Monats abrufen'}
                    </Button>
                    
                    <Button
                      onClick={handleUpdateRate}
                      disabled={isUpdating || !usdEurRate || currentPeriod.status === 'LOCKED'}
                      className="w-full"
                    >
                      {isUpdating ? 'Setze Kurs...' : 'Kurs fixieren'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Calculation */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Provisionsberechnung</CardTitle>
                  <CardDescription>
                    Berechnen Sie alle Provisionen für diese Periode neu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded">
                    <h4 className="font-medium text-blue-900 mb-2">Voraussetzungen für Berechnung:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li className={currentPeriod.usdEurRate ? 'text-green-700' : ''}>
                        ✓ USD/EUR Kurs gesetzt: {currentPeriod.usdEurRate ? 'Ja' : 'Nein'}
                      </li>
                      <li className={currentPeriod._count.revenueItems > 0 ? 'text-green-700' : ''}>
                        ✓ Revenue-Daten importiert: {currentPeriod._count.revenueItems} Items
                      </li>
                      <li className={currentPeriod.status !== 'LOCKED' ? 'text-green-700' : 'text-red-700'}>
                        ✓ Periode nicht gesperrt: {currentPeriod.status !== 'LOCKED' ? 'Ja' : 'Nein'}
                      </li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleRecalculate}
                    disabled={
                      isRecalculating || 
                      !currentPeriod.usdEurRate || 
                      currentPeriod._count.revenueItems === 0 ||
                      currentPeriod.status === 'LOCKED'
                    }
                    className="w-full"
                  >
                    {isRecalculating ? 'Berechne Provisionen...' : 'Provisionen neu berechnen'}
                  </Button>

                  {currentPeriod._count.commissions > 0 && (
                    <div className="text-sm text-green-600">
                      ✓ {currentPeriod._count.commissions} Provisionskomponenten bereits berechnet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}