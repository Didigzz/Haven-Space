/**
 * Validates a Philippine mobile number. Matches the Worker's
 * validatePhilippinePhone: strip non-digits, then accept (63|0)9XXXXXXXXX.
 */
export function isPhilippinePhone(value: string): boolean {
  const clean = value.replace(/\D/g, '');

  return /^(63|0)?9\d{9}$/.test(clean);
}
