import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Use direct SQL without Prisma to avoid connection issues
    const bcrypt = require('bcryptjs')
    const { Pool } = require('pg')
    
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL
    
    if (!databaseUrl) {
      return NextResponse.json({
        error: 'No database URL found',
        available: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          DATABASE_PRIVATE_URL: !!process.env.DATABASE_PRIVATE_URL,
          PGHOST: !!process.env.PGHOST,
          PGPASSWORD: !!process.env.PGPASSWORD
        }
      }, { status: 500 })
    }
    
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    })
    
    try {
      // Test connection
      const client = await pool.connect()
      console.log('✅ Connected to database')
      
      // Check if admin exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        ['admin@trend4media.local']
      )
      
      if (existingUser.rows.length > 0) {
        client.release()
        return NextResponse.json({
          success: true,
          message: 'Admin already exists! You can login now.',
          email: 'admin@trend4media.local',
          password: 'password123'
        })
      }
      
      // Create admin user with direct SQL
      const hashedPassword = await bcrypt.hash('password123', 10)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await client.query(`
        INSERT INTO users (id, email, name, role, active, hash, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        userId,
        'admin@trend4media.local',
        'Admin User',
        'ADMIN',
        true,
        hashedPassword
      ])
      
      client.release()
      
      return NextResponse.json({
        success: true,
        message: 'Admin account created with direct SQL!',
        credentials: {
          email: 'admin@trend4media.local',
          password: 'password123'
        }
      })
      
    } finally {
      await pool.end()
    }
    
  } catch (error) {
    console.error('Direct seed error:', error)
    
    return NextResponse.json({
      error: 'Direct SQL seed failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Direct SQL Seed API - Bypasses Prisma completely',
    usage: 'POST to create admin account with raw SQL'
  })
}