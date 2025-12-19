import { PLATFORM_CONFIG } from './constants';

/**
 * Format currency in Ghana Cedis
 */
export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${PLATFORM_CONFIG.CURRENCY_SYMBOL}0.00`;
  return `${PLATFORM_CONFIG.CURRENCY_SYMBOL}${numAmount.toFixed(2)}`;
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Assuming Ghana phone format: 0XX XXX XXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Format quantity with unit
 */
export function formatQuantity(quantity: number, unit: string): string {
  if (!unit) return `${quantity}`;
  const unitLabels: Record<string, string> = {
    KG: 'kg',
    GRAM: 'g',
    PIECE: quantity === 1 ? 'piece' : 'pieces',
    PIECES: quantity === 1 ? 'piece' : 'pieces',
    BUNCH: quantity === 1 ? 'bunch' : 'bunches',
    BUNCHES: quantity === 1 ? 'bunch' : 'bunches',
    CRATE: quantity === 1 ? 'crate' : 'crates',
    BAG: quantity === 1 ? 'bag' : 'bags',
    TUBER: quantity === 1 ? 'tuber' : 'tubers',
    LITRE: 'L',
  };
  return `${quantity} ${unitLabels[unit] || unit.toLowerCase()}`;
}

/**
 * Format rating (e.g., 4.5)
 */
export function formatRating(rating: number | null): string {
  if (rating === null) return 'No rating';
  return rating.toFixed(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format countdown time (for cart expiry)
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Pluralize a word
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Format order number for display
 */
export function formatOrderNumber(orderNumber: string): string {
  return `#${orderNumber}`;
}
