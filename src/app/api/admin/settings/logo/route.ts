import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, unlink, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png')
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false,
        error: 'Nicht autorisiert',
        details: 'Nur Administratoren können Logos hochladen'
      }, { status: 401 })
    }

    console.log('📤 Starting logo upload...')

    const formData = await request.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return NextResponse.json({ 
        success: false,
        error: 'Keine Datei ausgewählt',
        details: 'Bitte wählen Sie eine Bilddatei aus'
      }, { status: 400 })
    }

    console.log(`📁 File received: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`)

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false,
        error: 'Ungültiger Dateityp',
        details: `Erlaubte Formate: PNG, JPG, SVG, WebP. Ihr Format: ${file.type}`
      }, { status: 400 })
    }

    // Validate file size
    if (file.size === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Datei ist leer',
        details: 'Die ausgewählte Datei hat eine Größe von 0 Bytes'
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(1)
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1)
      return NextResponse.json({ 
        success: false,
        error: 'Datei zu groß',
        details: `Maximum: ${maxSizeMB}MB, Ihre Datei: ${fileSizeMB}MB`
      }, { status: 400 })
    }

    // Validate file name
    if (file.name.length > 100) {
      return NextResponse.json({ 
        success: false,
        error: 'Dateiname zu lang',
        details: 'Dateiname darf maximal 100 Zeichen haben'
      }, { status: 400 })
    }

    console.log('✅ File validation passed')

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log(`💾 Saving file to: ${LOGO_PATH}`)

    // Ensure public directory exists
    const publicDir = path.join(process.cwd(), 'public')
    try {
      await writeFile(path.join(publicDir, '.keep'), '')
    } catch (dirError) {
      console.log('📁 Public directory already exists or created')
    }

    // Save file
    await writeFile(LOGO_PATH, buffer)
    console.log('✅ Logo saved successfully')

    // Verify file was saved
    if (!existsSync(LOGO_PATH)) {
      throw new Error('Datei wurde nicht gespeichert')
    }

    return NextResponse.json({
      success: true,
      message: 'Logo erfolgreich hochgeladen',
      details: {
        filename: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type,
        dimensions: 'Wird automatisch skaliert',
        path: '/api/admin/settings/logo'
      }
    })

  } catch (error) {
    console.error('❌ Logo upload error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Hochladen des Logos',
      details: error instanceof Error ? error.message : 'Unbekannter Server-Fehler',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check if logo exists
    if (!existsSync(LOGO_PATH)) {
      return new NextResponse(null, { status: 404 })
    }

    // Read and return logo file
    const fileBuffer = await readFile(LOGO_PATH)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      }
    })

  } catch (error) {
    console.error('Logo serve error:', error)
    return new NextResponse(null, { status: 404 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove logo file if it exists
    if (existsSync(LOGO_PATH)) {
      await unlink(LOGO_PATH)
    }

    return NextResponse.json({
      success: true,
      message: 'Logo erfolgreich entfernt'
    })

  } catch (error) {
    console.error('Logo delete error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Entfernen des Logos' },
      { status: 500 }
    )
  }
}