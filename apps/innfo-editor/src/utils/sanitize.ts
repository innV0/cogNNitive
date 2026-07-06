/**
 * Converts a string to a clean, URL-safe slug / identifier.
 * Useful for DOM IDs, key generation, and routing.
 */
export const slugify = (s: string): string => {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Sanitizes a concept or node name to make it a safe identifier
 * containing only alphanumeric characters and underscores.
 */
export const sanitizeId = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9]/g, '_')
}

/**
 * Strips markdown formatting (bold, italic, wiki-links) from a string.
 * Single source for all formatting-stripping operations.
 */
export const stripMarkdownFormatting = (s: string): string => {
  return s.replace(/\*\*|\*|__|\[\[|\]\]/g, '').trim()
}
