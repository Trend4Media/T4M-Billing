'use client'

import { useState, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrentPeriodId, formatPeriod } from '@/lib/utils'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: boolean, message: string } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const currentPeriod = getCurrentPeriodId()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadResult(null)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('logo', selectedFile)

      const response = await fetch('/api/admin/settings/logo', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      setUploadResult(result)

      if (result.success) {
        setSelectedFile(null)
        setLogoPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }

    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Fehler beim Upload des Logos'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('Sind Sie sicher, dass Sie das Logo entfernen möchten?')) return

    try {
      const response = await fetch('/api/admin/settings/logo', {
        method: 'DELETE'
      })

      const result = await response.json()
      setUploadResult(result)
    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Fehler beim Entfernen des Logos'
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
              <p className="text-gray-600">System-Konfiguration und Design</p>
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
            <Link
              href="/admin/settings"
              className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600"
            >
              Einstellungen
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Upload Result */}
          {uploadResult && (
            <div className={`mb-6 p-4 rounded ${uploadResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {uploadResult.message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Logo Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Logo hochladen</CardTitle>
                <CardDescription>
                  Laden Sie das Trend4Media Logo für das Billing System hoch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Current Logo Display */}
                <div>
                  <Label>Aktuelles Logo</Label>
                  <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <img
                      src="/api/admin/settings/logo"
                      alt="Aktuelles Logo"
                      className="max-h-24 mx-auto"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden text-gray-500 text-sm">
                      Kein Logo hochgeladen
                    </div>
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="logo">Neues Logo hochladen</Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                  />
                  <div className="text-sm text-gray-600">
                    Unterstützte Formate: PNG, JPG, SVG (max. 2MB)
                  </div>
                </div>

                {/* Preview */}
                {logoPreview && (
                  <div>
                    <Label>Vorschau</Label>
                    <div className="mt-2 p-4 border rounded-lg">
                      <img
                        src={logoPreview}
                        alt="Logo Vorschau"
                        className="max-h-24 mx-auto"
                      />
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="flex-1"
                  >
                    {isUploading ? 'Lade hoch...' : 'Logo hochladen'}
                  </Button>
                  
                  <Button
                    onClick={handleRemoveLogo}
                    disabled={isUploading}
                    variant="destructive"
                  >
                    Entfernen
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Design Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Design-Einstellungen</CardTitle>
                <CardDescription>
                  Anpassung des visuellen Erscheinungsbilds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <div>
                  <h4 className="font-medium mb-2">Logo-Platzierung</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>✅ Login-Seite (Kopfbereich, zentriert)</div>
                    <div>✅ Manager Dashboard (Header, links)</div>
                    <div>✅ Admin Dashboard (Header, links)</div>
                    <div>✅ Alle Admin-Unterseiten (Header)</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Logo-Spezifikationen</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>• <strong>Empfohlene Größe:</strong> 200x60 Pixel</div>
                    <div>• <strong>Format:</strong> PNG mit transparentem Hintergrund</div>
                    <div>• <strong>Maximale Dateigröße:</strong> 2MB</div>
                    <div>• <strong>Seitenverhältnis:</strong> 3:1 (Breite:Höhe)</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Verwendung</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Das Logo wird automatisch in allen Bereichen des Systems angezeigt:</div>
                    <div>• Skaliert automatisch je nach Kontext</div>
                    <div>• Responsive Design für mobile Geräte</div>
                    <div>• Fallback auf Text-Logo wenn Bild nicht verfügbar</div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-medium text-blue-900 mb-2">Hinweis:</h4>
                  <p className="text-sm text-blue-800">
                    Nach dem Hochladen wird das Logo sofort in allen Bereichen des Systems angezeigt. 
                    Ein Browser-Refresh kann erforderlich sein, um Änderungen zu sehen.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}