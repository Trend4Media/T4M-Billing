import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Use dynamic imports to avoid build issues
    const { PrismaClient } = await import('@prisma/client')
    const bcrypt = await import('bcryptjs')
    
    const prisma = new PrismaClient()
    
    try {
      // Test connection
      await prisma.$connect()
      
      // Check if admin exists
      const existingAdmin = await prisma.user.findFirst({
        where: { email: 'admin@trend4media.local' }
      })
      
      if (existingAdmin) {
        return NextResponse.json({
          success: true,
          message: 'Admin account already exists! You can login now.',
          email: 'admin@trend4media.local'
        })
      }
      
      // Create admin only (minimal seed)
      const hashedPassword = await bcrypt.hash('password123', 10)
      
      const admin = await prisma.user.create({
        data: {
          email: 'admin@trend4media.local',
          name: 'Admin User',
          role: 'ADMIN',
          hash: hashedPassword,
          active: true,
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Admin account created successfully!',
        user: {
          email: admin.email,
          name: admin.name,
          role: admin.role
        },
        instructions: 'You can now login with: admin@trend4media.local / password123'
      })
      
    } finally {
      await prisma.$disconnect()
    }
    
  } catch (error) {
    console.error('Simple seed error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create admin account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simple Seed API - Creates only admin account',
    usage: 'POST to this endpoint to create admin@trend4media.local'
  })
}