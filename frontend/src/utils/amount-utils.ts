/**
 * Amount input sanitization and formatting utilities for XLM amounts
 */

/**
 * Sanitizes amount input by removing invalid characters and enforcing format rules
 * 
 * Rules:
 * - Removes all non-numeric characters except decimal point
 * - Allows only one decimal point (first occurrence preserved)
 * - Limits to 7 decimal places (XLM precision standard)
 * 
 * @param input - Raw input string from user
 * @returns Sanitized numeric string
 * 
 * @example
 * sanitizeAmountInput('abc123.45') // '123.45'
 * sanitizeAmountInput('12.34.56') // '12.3456'
 * sanitizeAmountInput('1.12345678') // '1.1234567'
 */
export const sanitizeAmountInput = (input: string): string => {
  // Remove non-numeric characters except decimal point
  let sanitized = input.replace(/[^\d.]/g, '');
  
  // Allow only one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit to 7 decimal places
  if (parts.length === 2 && parts[1].length > 7) {
    sanitized = parts[0] + '.' + parts[1].substring(0, 7);
  }
  
  return sanitized;
};

/**
 * Formats amount for display in Transaction Summary with exactly 2 decimal places
 * 
 * Rules:
 * - Formats to exactly 2 decimal places
 * - Preserves integer part unchanged
 * - Returns string representation suitable for display
 * 
 * @param amount - Numeric amount value
 * @returns Formatted string with exactly 2 decimal places
 * 
 * @example
 * formatDisplayAmount(100) // '100.00'
 * formatDisplayAmount(100.5) // '100.50'
 * formatDisplayAmount(100.123456) // '100.12'
 */
export const formatDisplayAmount = (amount: number): string => {
  return amount.toFixed(2);
};
