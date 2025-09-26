import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate predikat based on nilai (score)
 * Standardized function for consistent predikat generation across the system
 */
export function generatePredikat(nilai: number): string {
  if (isNaN(nilai)) return '-';
  if (nilai === 100) return 'Sempurna';
  if (nilai >= 90) return 'Sangat Baik';
  if (nilai >= 80) return 'Baik';
  if (nilai >= 70) return 'Cukup';
  return 'Kurang';
}
