'use client'

import React, { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCurrentPeriodId, formatPeriod } from '@/lib/utils'

interface DiamondStats {
  periodId: string
  totalDiamonds: number
  managerStats: Array<{
    managerId: string
    managerName: string
    managerRole: string
    periodId: string
    totalDiamonds: number
    creatorCount: number
  }>
}

export default function DiamondsPage() {
  const { data: session } = useSession()
  const [diamondStats, setDiamondStats] = useState<DiamondStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriodId())
  
  const currentPeriod = getCurrentPeriodId()

  useEffect(() => {
    loadDiamondStats(selectedPeriod)
  }, [selectedPeriod])

  const loadDiamondStats = async (periodId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/diamonds?periodId=${periodId}`)
      if (response.ok) {
        const data = await response.json()
        setDiamondStats(data)
      } else {
        console.error('Failed to load diamond stats')
      }
    } catch (error) {
      console.error('Error loading diamond stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('de-DE').format(num)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Diamond-Statistiken</h1>
              <p className="text-gray-600">TikTok Diamond-Aggregation für Transparenz und Audits</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Periode: {formatPeriod(selectedPeriod)}
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
              href="/admin/diamonds"
              className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600"
            >
              Diamonds
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
          
          {/* Period Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Periode auswählen</CardTitle>
              <CardDescription>
                Wählen Sie die Periode für die Diamond-Statistiken
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  placeholder="YYYYMM"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <Button onClick={() => loadDiamondStats(selectedPeriod)}>
                  Laden
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  Lade Diamond-Statistiken...
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diamond Statistics */}
          {!loading && diamondStats && (
            <div className="space-y-6">
              {/* Total Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Gesamtübersicht</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {formatNumber(diamondStats.totalDiamonds)}
                      </div>
                      <div className="text-sm text-gray-500">Gesamte Diamonds</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {diamondStats.managerStats.length}
                      </div>
                      <div className="text-sm text-gray-500">Manager</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {diamondStats.managerStats.reduce((sum, stat) => sum + stat.creatorCount, 0)}
                      </div>
                      <div className="text-sm text-gray-500">Creators</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Manager Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Manager-Aufschlüsselung</CardTitle>
                  <CardDescription>
                    Diamond-Statistiken nach Manager für Periode {formatPeriod(diamondStats.periodId)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Manager
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rolle
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Creators
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Diamonds
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ø pro Creator
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {diamondStats.managerStats
                          .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
                          .map((stat) => (
                            <tr key={stat.managerId}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {stat.managerName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  stat.managerRole === 'TEAM_LEADER' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {stat.managerRole === 'TEAM_LEADER' ? 'Team Leader' : 'Sales Rep'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {stat.creatorCount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatNumber(stat.totalDiamonds)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {stat.creatorCount > 0 
                                  ? formatNumber(Math.round(stat.totalDiamonds / stat.creatorCount))
                                  : '0'
                                }
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* No Data State */}
          {!loading && !diamondStats && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  Keine Diamond-Daten für diese Periode gefunden
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}