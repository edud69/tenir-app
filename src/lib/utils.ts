import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines classnames with tailwind-merge to handle conflicts
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'CAD')
 * @param locale - The locale for formatting (default: 'fr-CA')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'CAD',
  locale: string = 'fr-CA'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported locales
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Formats a date string or Date object
 * @param date - The date to format (string or Date object)
 * @param locale - The locale for formatting (default: 'fr-CA')
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  locale: string = 'fr-CA'
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Date invalide';
    }

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  } catch (error) {
    return 'Date invalide';
  }
}

/**
 * Formats a number as a percentage
 * @param value - The value to format (0-1 or 0-100)
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @param isDecimal - Whether the value is in decimal format (0-1) vs percentage (0-100) (default: true)
 * @returns Formatted percentage string
 */
export function formatPercent(
  value: number,
  decimalPlaces: number = 2,
  isDecimal: boolean = true
): string {
  try {
    const percentage = isDecimal ? value * 100 : value;
    return `${percentage.toFixed(decimalPlaces)}%`;
  } catch (error) {
    return '0%';
  }
}
