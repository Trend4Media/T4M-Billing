'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrentPeriodId, formatPeriod } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  role: string
  active: boolean
}

interface OrgEdge {
  id: string
  parentId: string
  childId: string
  validFrom: string
  validTo: string | null
  parent: User
  child: User
}

interface OrgStructure {
  user: User
  children: OrgStructure[]
  level: number
}

export default function GenealogyPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [orgEdges, setOrgEdges] = useState<OrgEdge[]>([])
  const [orgStructure, setOrgStructure] = useState<OrgStructure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedParent, setSelectedParent] = useState('')
  const [selectedChild, setSelectedChild] = useState('')
  const [isCreatingEdge, setIsCreatingEdge] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const currentPeriod = getCurrentPeriodId()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersResponse, edgesResponse] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/genealogy')
      ])

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users)
      }

      if (edgesResponse.ok) {
        const edgesData = await edgesResponse.json()
        setOrgEdges(edgesData.edges)
        setOrgStructure(edgesData.structure)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Laden der Daten' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateEdge = async () => {
    if (!selectedParent || !selectedChild) return

    setIsCreatingEdge(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/genealogy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: selectedParent,
          childId: selectedChild
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Organisationsstruktur erfolgreich aktualisiert' })
        setSelectedParent('')
        setSelectedChild('')
        await fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler beim Erstellen der Verbindung' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Erstellen der Verbindung' })
    } finally {
      setIsCreatingEdge(false)
    }
  }

  const handleRemoveEdge = async (edgeId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Verbindung entfernen möchten?')) return

    try {
      const response = await fetch(`/api/admin/genealogy/${edgeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Verbindung erfolgreich entfernt' })
        await fetchData()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Fehler beim Entfernen der Verbindung' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Entfernen der Verbindung' })
    }
  }

  const renderOrgStructure = (structure: OrgStructure[], level: number = 0) => {
    return structure.map(node => (
      <div key={node.user.id} className={`ml-${level * 4}`}>
        <div className={`flex items-center py-2 px-4 mb-2 rounded ${
          node.user.role === 'TEAM_LEADER' ? 'bg-blue-50 border-l-4 border-blue-400' :
          node.user.role === 'SALES_REP' ? 'bg-green-50 border-l-4 border-green-400' :
          'bg-gray-50 border-l-4 border-gray-400'
        }`}>
          <div className="flex-1">
            <div className="font-medium">{node.user.name}</div>
            <div className="text-sm text-gray-600">{node.user.email}</div>
            <div className="text-xs text-gray-500">
              {node.user.role === 'TEAM_LEADER' ? 'Team Leader' : 
               node.user.role === 'SALES_REP' ? 'Live Manager' : 
               node.user.role} • Level {level + 1}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {node.children.length} Untergeordnete
          </div>
        </div>
        {node.children.length > 0 && (
          <div className="ml-4">
            {renderOrgStructure(node.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  const availableParents = users.filter(u => u.role === 'TEAM_LEADER' && u.active)
  const availableChildren = users.filter(u => 
    (u.role === 'TEAM_LEADER' || u.role === 'SALES_REP') && 
    u.active && 
    u.id !== selectedParent
  )

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
              <h1 className="text-3xl font-bold text-gray-900">Genealogy Management</h1>
              <p className="text-gray-600">Organisationsstruktur und Downline-Verwaltung</p>
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
              className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600"
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create New Edge */}
            <Card>
              <CardHeader>
                <CardTitle>Neue Verbindung erstellen</CardTitle>
                <CardDescription>
                  Fügen Sie eine neue Parent-Child-Beziehung hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="parent">Team Leader (Parent)</Label>
                  <select
                    id="parent"
                    value={selectedParent}
                    onChange={(e) => setSelectedParent(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Wählen Sie einen Team Leader</option>
                    {availableParents.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="child">Untergeordneter Manager (Child)</Label>
                  <select
                    id="child"
                    value={selectedChild}
                    onChange={(e) => setSelectedChild(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={!selectedParent}
                  >
                    <option value="">Wählen Sie einen Manager</option>
                    {availableChildren.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) - {user.role === 'TEAM_LEADER' ? 'Team Leader' : 'Live Manager'}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleCreateEdge}
                  disabled={!selectedParent || !selectedChild || isCreatingEdge}
                  className="w-full"
                >
                  {isCreatingEdge ? 'Erstelle...' : 'Verbindung erstellen'}
                </Button>

                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">Hinweise:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Nur Team Leader können als Parent fungieren</li>
                    <li>• System berechnet automatisch Level A/B/C</li>
                    <li>• Änderungen wirken sich auf Downline-Provisionen aus</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Organization Structure */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Organisationsstruktur</CardTitle>
                <CardDescription>
                  Hierarchische Übersicht der Manager-Struktur
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orgStructure.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {renderOrgStructure(orgStructure)}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    Keine Organisationsstruktur vorhanden
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Edges */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Aktive Verbindungen</CardTitle>
                <CardDescription>
                  Alle aktiven Parent-Child-Beziehungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orgEdges.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Team Leader (Parent)</th>
                          <th className="text-left py-2">Manager (Child)</th>
                          <th className="text-left py-2">Child Rolle</th>
                          <th className="text-center py-2">Gültig seit</th>
                          <th className="text-center py-2">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orgEdges.map(edge => (
                          <tr key={edge.id} className="border-b">
                            <td className="py-2">
                              <div>
                                <div className="font-medium">{edge.parent.name}</div>
                                <div className="text-gray-500 text-xs">{edge.parent.email}</div>
                              </div>
                            </td>
                            <td className="py-2">
                              <div>
                                <div className="font-medium">{edge.child.name}</div>
                                <div className="text-gray-500 text-xs">{edge.child.email}</div>
                              </div>
                            </td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                edge.child.role === 'TEAM_LEADER' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {edge.child.role === 'TEAM_LEADER' ? 'Team Leader' : 'Live Manager'}
                              </span>
                            </td>
                            <td className="text-center py-2 text-xs">
                              {new Date(edge.validFrom).toLocaleDateString('de-DE')}
                            </td>
                            <td className="text-center py-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveEdge(edge.id)}
                              >
                                Entfernen
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    Keine aktiven Verbindungen vorhanden
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}