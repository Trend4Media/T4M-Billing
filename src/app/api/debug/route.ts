import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  let prisma: PrismaClient | null = null
  
  try {
    console.log('🔍 Starting debug check...')
    
    // Test 1: Can we create Prisma client?
    prisma = new PrismaClient()
    console.log('✅ Prisma client created')
    
    // Test 2: Can we connect to database?
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Test 3: Can we query the database?
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database query successful:', result)
    
    // Test 4: Do tables exist?
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log('✅ Tables found:', tables)
    
    // Test 5: Can we count users?
    const userCount = await prisma.user.count()
    console.log('✅ User count:', userCount)
    
    return NextResponse.json({
      success: true,
      message: 'All database tests passed!',
      tests: {
        prismaClient: '✅ OK',
        connection: '✅ OK',
        query: '✅ OK',
        tables: tables,
        userCount: userCount
      }
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Database debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
    
  } finally {
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}