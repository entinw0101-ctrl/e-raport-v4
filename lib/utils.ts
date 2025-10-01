import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate predikat based on nilai (score) - Scale 0-10
 * Standardized function for consistent predikat generation across the system
 */
export function generatePredikat(nilai: number): string {
  if (isNaN(nilai)) return '-';
  if (nilai === 10) return 'Sempurna';
  if (nilai >= 9) return 'Sangat Baik';
  if (nilai >= 8) return 'Baik';
  if (nilai >= 7) return 'Cukup';
  return 'Kurang';
}

/**
 * Get color class for nilai display - red for scores <= 5
 */
export function getNilaiColor(nilai: number): string {
  if (isNaN(nilai)) return '';
  return nilai <= 5 ? 'text-red-600 font-bold' : '';
}
