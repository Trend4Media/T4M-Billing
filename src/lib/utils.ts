import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency utilities
export function roundToTwoDecimals(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function convertUsdToEur(usdAmount: number, rate: number): number {
  return roundToTwoDecimals(usdAmount * rate)
}

export function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Period utilities
export function getCurrentPeriodId(): string {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function parsePeriodId(periodId: string): { year: number; month: number } {
  const year = parseInt(periodId.substring(0, 4))
  const month = parseInt(periodId.substring(4, 6))
  return { year, month }
}

export function formatPeriod(periodId: string): string {
  const { year, month } = parsePeriodId(periodId)
  return `${String(month).padStart(2, '0')}/${year}`
}