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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Nur Bilddateien sind erlaubt' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `Datei zu groß. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save file
    await writeFile(LOGO_PATH, buffer)

    return NextResponse.json({
      success: true,
      message: 'Logo erfolgreich hochgeladen',
      filename: file.name,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Hochladen des Logos' },
      { status: 500 }
    )
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