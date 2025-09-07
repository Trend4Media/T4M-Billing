import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseExcelFile, type ImportRow } from '@/lib/excel-parser'
import { getCurrentPeriodId } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const periodId = formData.get('periodId') as string || getCurrentPeriodId()

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ error: 'Nur Excel-Dateien (.xlsx, .xls) sind erlaubt' }, { status: 400 })
    }

    // Check if period exists
    const period = await prisma.period.findUnique({
      where: { id: periodId }
    })

    if (!period) {
      return NextResponse.json({ error: 'Periode nicht gefunden' }, { status: 400 })
    }

    if (period.status === 'LOCKED') {
      return NextResponse.json({ error: 'Periode ist gesperrt und kann nicht bearbeitet werden' }, { status: 400 })
    }

    // Parse Excel file
    const buffer = Buffer.from(await file.arrayBuffer())
    const parseResult = parseExcelFile(buffer)

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Fehler beim Parsen der Excel-Datei',
        details: parseResult.errors,
        warnings: parseResult.warnings
      }, { status: 400 })
    }

    // Create import batch
    const importBatch = await prisma.importBatch.create({
      data: {
        periodId,
        fileName: file.name,
        status: 'PROCESSING',
        rowCount: parseResult.data.length
      }
    })

    // Process each row
    const processResults = await processImportRows(parseResult.data, periodId, importBatch.id)

    // Update import batch with results
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: processResults.errors.length > 0 ? 'FAILED' : 'COMPLETED',
        errorSummary: {
          totalRows: parseResult.data.length,
          successfulRows: processResults.successful,
          failedRows: processResults.errors.length,
          warnings: [...parseResult.warnings, ...processResults.warnings],
          errors: processResults.errors
        }
      }
    })

    return NextResponse.json({
      success: true,
      importBatch: {
        id: importBatch.id,
        fileName: file.name,
        totalRows: parseResult.data.length,
        successfulRows: processResults.successful,
        failedRows: processResults.errors.length,
        warnings: [...parseResult.warnings, ...processResults.warnings],
        errors: processResults.errors,
        columnMappings: parseResult.columnMappings
      }
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler beim Import' },
      { status: 500 }
    )
  }
}

interface ProcessResult {
  successful: number
  errors: string[]
  warnings: string[]
}

async function processImportRows(
  rows: ImportRow[],
  periodId: string,
  importBatchId: string
): Promise<ProcessResult> {
  const result: ProcessResult = {
    successful: 0,
    errors: [],
    warnings: []
  }

  // Get all managers for name matching
  const managers = await prisma.user.findMany({
    where: {
      role: { in: ['TEAM_LEADER', 'SALES_REP'] },
      active: true
    }
  })

  // Create a map for fuzzy manager matching
  const managerMap = new Map<string, string>()
  managers.forEach(manager => {
    const normalizedName = manager.name.toLowerCase().trim()
    managerMap.set(normalizedName, manager.id)
    
    // Also add variations (first name, last name, etc.)
    const nameParts = normalizedName.split(/\s+/)
    nameParts.forEach(part => {
      if (part.length > 2) {
        managerMap.set(part, manager.id)
      }
    })
  })

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 1

    try {
      // Find manager by name (fuzzy matching)
      const normalizedManagerName = row.managerName.toLowerCase().trim()
      let managerId = managerMap.get(normalizedManagerName)

      if (!managerId) {
        // Try partial matching
        const matchingEntry = Array.from(managerMap.entries()).find(([name]) =>
          name.includes(normalizedManagerName) || normalizedManagerName.includes(name)
        )
        managerId = matchingEntry?.[1]
      }

      if (!managerId) {
        result.warnings.push(`Zeile ${rowNumber}: Manager "${row.managerName}" nicht gefunden - übersprungen`)
        continue
      }

      // Find or create creator
      let creator = await prisma.creator.findUnique({
        where: { handle: row.handle }
      })

      if (!creator) {
        creator = await prisma.creator.create({
          data: {
            handle: row.handle,
            managerId,
            active: true
          }
        })
      } else if (creator.managerId !== managerId) {
        // Update manager if different
        await prisma.creator.update({
          where: { id: creator.id },
          data: { managerId }
        })
        result.warnings.push(`Zeile ${rowNumber}: Creator "${row.handle}" Manager geändert`)
      }

      // Create or update revenue item
      await prisma.revenueItem.upsert({
        where: {
          periodId_creatorId: {
            periodId,
            creatorId: creator.id
          }
        },
        update: {
          managerId,
          handle: row.handle,
          diamonds: row.diamonds,
          estBaseUsd: row.estBaseUsd,
          estActivityUsd: row.estActivityUsd,
          m0_5: row.m0_5 > 0,
          m1: row.m1 > 0,
          m1Retention: row.m1Retention > 0,
          m2: row.m2 > 0,
          importBatchId
        },
        create: {
          periodId,
          creatorId: creator.id,
          managerId,
          handle: row.handle,
          diamonds: row.diamonds,
          estBaseUsd: row.estBaseUsd,
          estActivityUsd: row.estActivityUsd,
          m0_5: row.m0_5 > 0,
          m1: row.m1 > 0,
          m1Retention: row.m1Retention > 0,
          m2: row.m2 > 0,
          importBatchId
        }
      })

      result.successful++

    } catch (error) {
      result.errors.push(`Zeile ${rowNumber}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  return result
}