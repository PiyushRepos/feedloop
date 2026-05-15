/**
 * Converts any string to a URL-safe slug segment.
 *
 * Steps:
 *  1. NFD normalize  — decomposes accented chars (é → e + combining accent)
 *  2. Strip combining diacritical marks — drops the accent, keeps the base letter
 *  3. Lowercase
 *  4. Strip anything that isn't alphanumeric, space or hyphen
 *  5. Collapse whitespace → single hyphens
 *  6. Collapse consecutive hyphens
 *  7. Strip leading / trailing hyphens (e.g. input starts or ends with "$")
 *  8. Cap at maxLength chars
 *  9. Fallback to provided default if result is empty (e.g. pure CJK or symbol-only input)
 *
 * Examples:
 *   slugify("What's #1??")       → "whats-1"
 *   slugify("Café Survey!")      → "cafe-survey"
 *   slugify("$100 Prize: Win!")  → "100-prize-win"
 *   slugify("你好世界")           → "untitled"
 *   slugify("  !!!  ")           → "untitled"
 */
export function slugify(
  input: string,
  { maxLength = 50, fallback = 'untitled' } = {}
): string {
  return (
    input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLength) || fallback
  );
}
