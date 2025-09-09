import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const LOGO_KEY = 'company_logo'

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

    console.log(`💾 Saving logo to database...`)

    // Save logo to database
    await prisma.systemSetting.upsert({
      where: { key: LOGO_KEY },
      update: {
        fileData: buffer,
        mimeType: file.type,
        value: file.name,
        updatedAt: new Date()
      },
      create: {
        key: LOGO_KEY,
        fileData: buffer,
        mimeType: file.type,
        value: file.name
      }
    })

    console.log('✅ Logo saved successfully to database')

    return NextResponse.json({
      success: true,
      message: 'Logo erfolgreich hochgeladen',
      details: {
        filename: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type,
        storage: 'Datenbank',
        path: '/api/admin/settings/logo'
      }
    })

  } catch (error) {
    console.error('❌ Logo upload error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Hochladen des Logos',
      details: error instanceof Error ? error.message : 'Unbekannter Server-Fehler',
      technicalInfo: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  try {
    console.log('🖼️ Fetching logo from database...')

    // Get logo from database
    const logoSetting = await prisma.systemSetting.findUnique({
      where: { key: LOGO_KEY },
      select: {
        fileData: true,
        mimeType: true,
        value: true
      }
    })

    if (!logoSetting || !logoSetting.fileData) {
      console.log('❌ No logo found in database')
      return new NextResponse('Logo nicht gefunden', { status: 404 })
    }

    console.log(`✅ Logo found: ${logoSetting.value}, Type: ${logoSetting.mimeType}`)

    return new NextResponse(logoSetting.fileData, {
      headers: {
        'Content-Type': logoSetting.mimeType || 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Disposition': `inline; filename="${logoSetting.value || 'logo.png'}"`
      }
    })

  } catch (error) {
    console.error('❌ Logo serve error:', error)
    return new NextResponse('Fehler beim Laden des Logos', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false,
        error: 'Nicht autorisiert' 
      }, { status: 401 })
    }

    console.log('🗑️ Removing logo from database...')

    // Remove logo from database
    await prisma.systemSetting.deleteMany({
      where: { key: LOGO_KEY }
    })

    console.log('✅ Logo removed successfully')

    return NextResponse.json({
      success: true,
      message: 'Logo erfolgreich entfernt'
    })

  } catch (error) {
    console.error('❌ Logo delete error:', error)
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Entfernen des Logos',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}