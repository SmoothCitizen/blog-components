// Estimated reading time for a post body (v0.6.0), shown on post cards as
// "N min read". Pure: it reads only the body string.
//
// Markup is stripped first (HTML tags and entities; markdown link/image
// targets and syntax characters), then words are counted by whitespace.
// Scripts written without spaces between words (Han, Hiragana, Katakana) are
// counted per character at their own rate, so a post in one of them does not
// read as "1 min".

export const WORDS_PER_MINUTE = 230;
export const CJK_CHARS_PER_MINUTE = 500;

const CJK_CHAR_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
const WORD_RE = /[\p{L}\p{N}]/u;

// The readable text of an HTML or markdown body (markup replaced by spaces).
export function bodyText(body: string): string {
  return body
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[#a-z0-9]+;/gi, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_#>|~]+/g, " ");
}

// Whole minutes, rounded up — at least 1 for any body with text, 0 for a body
// with no readable text (the card then shows no reading time).
export function readingMinutes(body: string): number {
  const text = bodyText(body);
  const cjk = (text.match(CJK_CHAR_RE) ?? []).length;
  const words = text
    .replace(CJK_CHAR_RE, " ")
    .split(/\s+/)
    .filter((w) => WORD_RE.test(w)).length;
  if (words === 0 && cjk === 0) return 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE + cjk / CJK_CHARS_PER_MINUTE));
}
