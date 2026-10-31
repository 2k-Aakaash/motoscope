import { v7 as uuidv7 } from "uuid";

/** UUIDv7: time-ordered (B-tree friendly), non-guessable, generated in the application like the former backend. */
export function newId(): string {
  return uuidv7();
}

export const SLUG_MAX_LENGTH = 120;

/**
 * Lowercase ASCII URL slug: "Arka Trailhawk 400 (2025)" → "arka-trailhawk-400-2025".
 * Diacritics are removed; any other run of non-alphanumeric characters becomes a single hyphen.
 */
export function slugify(input: string, maxLength = SLUG_MAX_LENGTH): string {
  let out = "";
  let pendingHyphen = false;
  for (const c of input.normalize("NFD")) {
    if (/\p{Mn}/u.test(c)) continue;
    if (/^[A-Za-z0-9]$/.test(c)) {
      if (pendingHyphen && out.length > 0) out += "-";
      out += c.toLowerCase();
      pendingHyphen = false;
    } else {
      pendingHyphen = true;
    }
  }
  return out.length <= maxLength ? out : out.slice(0, maxLength).replace(/-+$/, "");
}

export function isValidSlug(slug: string | null | undefined): boolean {
  return !!slug && slug.length <= SLUG_MAX_LENGTH && slug === slugify(slug);
}

export const MAX_SEARCH_TERMS = 5;

/** Splits free text into at most MAX_SEARCH_TERMS distinct (case-insensitive) whitespace-separated terms. */
export function searchTerms(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const term of text.split(/\s+/).filter(Boolean)) {
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length === MAX_SEARCH_TERMS) break;
  }
  return terms;
}

/** Escapes LIKE/ILIKE wildcards so user input matches literally (PostgreSQL's default escape is backslash). */
export function containsPattern(term: string): string {
  const escaped = term.trim().replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  return `%${escaped}%`;
}

/** Rejects control characters other than newline, carriage return and tab. */
export function isPlainText(value: string): boolean {
  return ![...value].some((c) => {
    const code = c.charCodeAt(0);
    return (code < 0x20 || (code >= 0x7f && code <= 0x9f)) && c !== "\n" && c !== "\r" && c !== "\t";
  });
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
