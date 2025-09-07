import * as XLSX from 'xlsx'
import { z } from 'zod'

// Expected column mappings (case-insensitive, fuzzy matching)
const COLUMN_MAPPINGS = {
  dataMonth: ['data month', 'month', 'periode', 'period'],
  handle: ['handle', 'creator handle', 'tiktok handle', 'creator'],
  managerName: ['creator network manager', 'manager', 'network manager', 'live manager'],
  diamonds: ['diamonds'],
  estBaseUsd: ['estimated bonus (usd, base)', 'base bonus', 'estimated bonus usd base', 'base usd'],
  estActivityUsd: ['estimated bonus – activeness task (usd)', 'activity bonus', 'activeness task usd', 'activity usd'],
  m0_5: ['estimated bonus – rookie half-milestone bonus task (usd)', 'rookie half milestone', 'm0.5', 'm0_5'],
  m1: ['rookie milestone 1 bonus task (usd)', 'milestone 1', 'm1'],
  m1Retention: ['estimated bonus – rookie milestone 1 retent (usd)', 'milestone 1 retention', 'm1 retention', 'm1_retention'],
  m2: ['estimated bonus – rookie milestone 2 bonus task (usd)', 'milestone 2', 'm2']
}

// Validation schema for imported data
const ImportRowSchema = z.object({
  dataMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Format muss YYYY-MM sein'),
  handle: z.string().min(1, 'Handle ist erforderlich'),
  managerName: z.string().min(1, 'Manager Name ist erforderlich'),
  diamonds: z.number().min(0, 'Diamonds muss >= 0 sein'),
  estBaseUsd: z.number().min(0, 'Base USD muss >= 0 sein'),
  estActivityUsd: z.number().min(0, 'Activity USD muss >= 0 sein'),
  m0_5: z.number().min(0, 'M0.5 muss >= 0 sein'),
  m1: z.number().min(0, 'M1 muss >= 0 sein'),
  m1Retention: z.number().min(0, 'M1 Retention muss >= 0 sein'),
  m2: z.number().min(0, 'M2 muss >= 0 sein'),
})

export type ImportRow = z.infer<typeof ImportRowSchema>

export interface ParseResult {
  success: boolean
  data: ImportRow[]
  errors: string[]
  warnings: string[]
  columnMappings: Record<string, string>
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
}

function findColumnMapping(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {}
  const normalizedHeaders = headers.map(h => normalizeColumnName(h))
  
  for (const [key, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
    let found = false
    
    for (const possibleName of possibleNames) {
      const normalizedPossible = normalizeColumnName(possibleName)
      
      // Exact match first
      const exactIndex = normalizedHeaders.indexOf(normalizedPossible)
      if (exactIndex !== -1) {
        mappings[key] = headers[exactIndex]
        found = true
        break
      }
      
      // Fuzzy match (contains)
      const fuzzyIndex = normalizedHeaders.findIndex(h => 
        h.includes(normalizedPossible) || normalizedPossible.includes(h)
      )
      if (fuzzyIndex !== -1) {
        mappings[key] = headers[fuzzyIndex]
        found = true
        break
      }
    }
    
    if (!found) {
      // Try partial matching for key terms
      const keyTerms = key.toLowerCase().replace(/([A-Z])/g, ' $1').trim().split(/\s+/)
      const matchingHeader = headers.find(header => {
        const normalizedHeader = normalizeColumnName(header)
        return keyTerms.some(term => normalizedHeader.includes(term))
      })
      
      if (matchingHeader) {
        mappings[key] = matchingHeader
      }
    }
  }
  
  return mappings
}

function parseNumericValue(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''))
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function parsePeriodValue(value: any): string {
  if (typeof value === 'string') {
    // Try different formats
    if (/^\d{4}-\d{2}$/.test(value)) return value
    if (/^\d{4}\d{2}$/.test(value)) {
      return `${value.substring(0, 4)}-${value.substring(4, 6)}`
    }
    if (/^\d{2}\/\d{4}$/.test(value)) {
      const [month, year] = value.split('/')
      return `${year}-${month.padStart(2, '0')}`
    }
  }
  
  // If it's a date object
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }
  
  return value?.toString() || ''
}

export function parseExcelFile(buffer: Buffer): ParseResult {
  const result: ParseResult = {
    success: false,
    data: [],
    errors: [],
    warnings: [],
    columnMappings: {}
  }

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    
    if (!sheetName) {
      result.errors.push('Keine Arbeitsblätter in der Excel-Datei gefunden')
      return result
    }

    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    if (jsonData.length < 2) {
      result.errors.push('Excel-Datei muss mindestens eine Header-Zeile und eine Datenzeile enthalten')
      return result
    }

    const headers = jsonData[0] as string[]
    const columnMappings = findColumnMapping(headers)
    result.columnMappings = columnMappings

    // Check for missing required columns
    const requiredColumns = ['dataMonth', 'handle', 'managerName', 'estBaseUsd', 'estActivityUsd']
    const missingColumns = requiredColumns.filter(col => !columnMappings[col])
    
    if (missingColumns.length > 0) {
      result.errors.push(`Fehlende erforderliche Spalten: ${missingColumns.join(', ')}`)
      return result
    }

    // Process data rows
    const dataRows = jsonData.slice(1) as any[][]
    const parsedData: ImportRow[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 2 // Excel row number (1-based + header)

      if (!row || row.every(cell => !cell)) continue // Skip empty rows

      try {
        const rowData = {
          dataMonth: parsePeriodValue(row[headers.indexOf(columnMappings.dataMonth)]),
          handle: row[headers.indexOf(columnMappings.handle)]?.toString().trim() || '',
          managerName: row[headers.indexOf(columnMappings.managerName)]?.toString().trim() || '',
          diamonds: parseNumericValue(row[headers.indexOf(columnMappings.diamonds)]),
          estBaseUsd: parseNumericValue(row[headers.indexOf(columnMappings.estBaseUsd)]),
          estActivityUsd: parseNumericValue(row[headers.indexOf(columnMappings.estActivityUsd)]),
          m0_5: parseNumericValue(row[headers.indexOf(columnMappings.m0_5)]),
          m1: parseNumericValue(row[headers.indexOf(columnMappings.m1)]),
          m1Retention: parseNumericValue(row[headers.indexOf(columnMappings.m1Retention)]),
          m2: parseNumericValue(row[headers.indexOf(columnMappings.m2)]),
        }

        // Validate row data
        const validatedRow = ImportRowSchema.parse(rowData)
        parsedData.push(validatedRow)

      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
          result.errors.push(`Zeile ${rowNumber}: ${errorMessages.join(', ')}`)
        } else {
          result.errors.push(`Zeile ${rowNumber}: Unbekannter Fehler beim Parsen`)
        }
      }
    }

    result.data = parsedData
    result.success = result.errors.length === 0

    // Add warnings for optional columns
    const optionalColumns = ['diamonds']
    optionalColumns.forEach(col => {
      if (!columnMappings[col]) {
        result.warnings.push(`Optionale Spalte '${col}' nicht gefunden - wird als 0 gesetzt`)
      }
    })

    if (result.data.length === 0 && result.errors.length === 0) {
      result.errors.push('Keine gültigen Datenzeilen gefunden')
    }

  } catch (error) {
    result.errors.push(`Fehler beim Lesen der Excel-Datei: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
  }

  return result
}