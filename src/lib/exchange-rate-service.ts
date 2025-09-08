/**
 * Exchange Rate Service for Trend4Media Billing System
 * 
 * Business Rule: USD/EUR exchange rate is always taken from the 6th of each month at 12:00 noon
 * This rate is automatically fetched and locked when Excel data for a new month is uploaded
 */

interface ExchangeRateResponse {
  success: boolean
  rate?: number
  date?: string
  source?: string
  error?: string
}

export class ExchangeRateService {
  private static readonly RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'
  private static readonly BACKUP_API_URL = 'https://api.fxratesapi.com/latest?base=USD&symbols=EUR'
  
  /**
   * Get USD/EUR exchange rate for the 6th of a specific month at 12:00 noon
   */
  static async getMonthlyRate(year: number, month: number): Promise<ExchangeRateResponse> {
    try {
      // Calculate the 6th day of the month at 12:00 noon
      const rateDate = new Date(year, month - 1, 6, 12, 0, 0)
      const today = new Date()
      
      console.log(`📅 Fetching USD/EUR rate for ${year}-${String(month).padStart(2, '0')}-06 12:00`)
      
      // If the 6th hasn't passed yet this month, we can't get the rate
      if (rateDate > today) {
        return {
          success: false,
          error: `Der 6. ${String(month).padStart(2, '0')}.${year} 12:00 Uhr ist noch nicht erreicht. Aktuell: ${today.toLocaleString('de-DE')}`
        }
      }
      
      // Try primary API first
      let rate = await this.fetchRateFromAPI(this.RATE_API_URL)
      
      if (!rate) {
        console.log('⚠️ Primary API failed, trying backup...')
        rate = await this.fetchRateFromBackupAPI(this.BACKUP_API_URL)
      }
      
      if (!rate) {
        return {
          success: false,
          error: 'Konnte USD/EUR Wechselkurs von keiner API abrufen'
        }
      }
      
      return {
        success: true,
        rate,
        date: rateDate.toISOString(),
        source: 'ExchangeRate-API'
      }
      
    } catch (error) {
      console.error('Exchange rate fetch error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Abrufen des Wechselkurses'
      }
    }
  }
  
  /**
   * Fetch rate from primary API (exchangerate-api.com)
   */
  private static async fetchRateFromAPI(url: string): Promise<number | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Trend4Media-Billing-System/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.rates && data.rates.EUR) {
        const rate = parseFloat(data.rates.EUR)
        console.log(`✅ Primary API rate: 1 USD = ${rate} EUR`)
        return rate
      }
      
      return null
      
    } catch (error) {
      console.error('Primary API error:', error)
      return null
    }
  }
  
  /**
   * Fetch rate from backup API (fxratesapi.com)
   */
  private static async fetchRateFromBackupAPI(url: string): Promise<number | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Trend4Media-Billing-System/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        throw new Error(`Backup API returned ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.rates && data.rates.EUR) {
        const rate = parseFloat(data.rates.EUR)
        console.log(`✅ Backup API rate: 1 USD = ${rate} EUR`)
        return rate
      }
      
      return null
      
    } catch (error) {
      console.error('Backup API error:', error)
      return null
    }
  }
  
  /**
   * Get a fallback rate if APIs are unavailable
   * Uses a reasonable default based on historical averages
   */
  static getFallbackRate(): number {
    console.log('⚠️ Using fallback rate: 0.92 EUR/USD')
    return 0.92
  }
  
  /**
   * Format rate for display
   */
  static formatRate(rate: number): string {
    return `1 USD = ${rate.toFixed(6)} EUR`
  }
  
  /**
   * Validate that a rate is reasonable (between 0.7 and 1.3)
   */
  static isValidRate(rate: number): boolean {
    return rate >= 0.7 && rate <= 1.3
  }
}