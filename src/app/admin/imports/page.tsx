'use client'

import { useState, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrentPeriodId, formatPeriod } from '@/lib/utils'

interface ImportResult {
  success: boolean
  importBatch?: {
    id: string
    fileName: string
    totalRows: number
    successfulRows: number
    failedRows: number
    warnings: string[]
    errors: string[]
    columnMappings: Record<string, string>
  }
  error?: string
  details?: string[]
  warnings?: string[]
}

export default function ImportsPage() {
  const { data: session } = useSession()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriodId())
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const currentPeriod = getCurrentPeriodId()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('periodId', selectedPeriod)

      const response = await fetch('/api/imports/upload', {
        method: 'POST',
        body: formData
      })

      const result: ImportResult = await response.json()
      setUploadResult(result)

      if (result.success) {
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }

    } catch (error) {
      setUploadResult({
        success: false,
        error: 'Fehler beim Upload der Datei'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Excel Import</h1>
              <p className="text-gray-600">Creator Revenue Daten importieren</p>
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
              className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600"
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
          
          {/* Upload Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Excel-Datei hochladen</CardTitle>
                <CardDescription>
                  Importieren Sie Creator Revenue Daten aus einer Excel-Datei
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="period">Zielperiode</Label>
                  <Input
                    id="period"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    placeholder="YYYY-MM"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="file">Excel-Datei (.xlsx, .xls)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                  />
                </div>

                {selectedFile && (
                  <div className="text-sm text-gray-600">
                    Ausgewählte Datei: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full"
                >
                  {isUploading ? 'Importiere...' : 'Import starten'}
                </Button>
              </CardContent>
            </Card>

            {/* Expected Format */}
            <Card>
              <CardHeader>
                <CardTitle>Erwartetes Excel-Format</CardTitle>
                <CardDescription>
                  Erforderliche Spalten (case-insensitive)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Spalte</div>
                    <div className="font-medium">Beschreibung</div>
                  </div>
                  <hr />
                  <div className="grid grid-cols-2 gap-2">
                    <div>Data Month</div>
                    <div>YYYY-MM Format</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Handle</div>
                    <div>TikTok Creator Handle</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Creator Network Manager</div>
                    <div>Live Manager Name</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Diamonds</div>
                    <div>Creator Diamonds (optional)</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Estimated Bonus (USD, Base)</div>
                    <div>Base Revenue USD</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Estimated Bonus – Activeness</div>
                    <div>Activity Revenue USD</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Rookie Half-Milestone</div>
                    <div>M0.5 erreicht (>0)</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Rookie Milestone 1</div>
                    <div>M1 erreicht (>0)</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Rookie Milestone 1 Retent</div>
                    <div>M1 Retention (>0)</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Rookie Milestone 2</div>
                    <div>M2 erreicht (>0)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <Card className={uploadResult.success ? 'border-green-200' : 'border-red-200'}>
              <CardHeader>
                <CardTitle className={uploadResult.success ? 'text-green-800' : 'text-red-800'}>
                  {uploadResult.success ? 'Import erfolgreich' : 'Import fehlgeschlagen'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uploadResult.success && uploadResult.importBatch ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Datei</div>
                        <div>{uploadResult.importBatch.fileName}</div>
                      </div>
                      <div>
                        <div className="font-medium">Zeilen gesamt</div>
                        <div>{uploadResult.importBatch.totalRows}</div>
                      </div>
                      <div>
                        <div className="font-medium">Erfolgreich</div>
                        <div className="text-green-600">{uploadResult.importBatch.successfulRows}</div>
                      </div>
                      <div>
                        <div className="font-medium">Fehler</div>
                        <div className="text-red-600">{uploadResult.importBatch.failedRows}</div>
                      </div>
                    </div>

                    {uploadResult.importBatch.warnings.length > 0 && (
                      <div>
                        <div className="font-medium text-yellow-800 mb-2">Warnungen:</div>
                        <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                          {uploadResult.importBatch.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {uploadResult.importBatch.errors.length > 0 && (
                      <div>
                        <div className="font-medium text-red-800 mb-2">Fehler:</div>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                          {uploadResult.importBatch.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <div className="font-medium mb-2">Spalten-Zuordnung:</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(uploadResult.importBatch.columnMappings).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600">{key}:</span>
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-red-800 font-medium">{uploadResult.error}</div>
                    {uploadResult.details && (
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {uploadResult.details.map((detail, index) => (
                          <li key={index}>{detail}</li>
                        ))}
                      </ul>
                    )}
                    {uploadResult.warnings && (
                      <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                        {uploadResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}