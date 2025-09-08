import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const pgHost = process.env.PGHOST
    const pgUser = process.env.PGUSER || 'postgres'
    const pgPassword = process.env.PGPASSWORD
    const pgDatabase = process.env.PGDATABASE || 'railway'
    const pgPort = process.env.PGPORT || '5432'
    
    if (!pgHost || !pgPassword) {
      return NextResponse.json({
        error: 'Missing PGHOST or PGPASSWORD environment variables',
        available: {
          PGHOST: !!pgHost,
          PGPASSWORD: !!pgPassword,
          PGUSER: pgUser,
          PGDATABASE: pgDatabase,
          PGPORT: pgPort
        }
      }, { status: 400 })
    }
    
    const correctDatabaseUrl = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}?sslmode=require`
    
    return NextResponse.json({
      success: true,
      message: 'Here is your correct DATABASE_URL:',
      correctDatabaseUrl,
      instructions: [
        '1. Copy the correctDatabaseUrl value below',
        '2. Go to Railway Variables',
        '3. Edit DATABASE_URL',
        '4. Paste the new value',
        '5. Save and redeploy'
      ]
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to generate DATABASE_URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}