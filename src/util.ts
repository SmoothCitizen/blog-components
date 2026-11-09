// Small shared helpers: escaping, JSON-LD safety, date formatting.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// JSON embedded in a <script> tag must not be able to break out of it.
export function jsonLdSafe(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

// ISO date (YYYY-MM-DD) for display and sitemap <lastmod>. "" when unparseable.
export function toIsoDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toISOString().slice(0, 10);
}

// A display date in the theme's `date_format` (v0.6.0). "iso" (the default) is
// the existing YYYY-MM-DD. "long" is the locale's long form for the page
// language `lang` ("November 9, 2026" for en, "9 November 2026" for en-GB,
// "9 de noviembre de 2026" for es). Deterministic: the locale is always passed
// explicitly (never the runtime default) and the date is read in UTC, so the
// build machine's locale or time zone cannot change the output. An invalid tag
// falls back to "en". "" when the date is unparseable.
export type DisplayDateFormat = "iso" | "long";
const LONG_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
};

export function formatDisplayDate(iso: string, format: DisplayDateFormat | null | undefined, lang: string): string {
  if (format !== "long") return toIsoDate(iso);
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return longDateFormatter(lang).format(new Date(t));
}

function longDateFormatter(lang: string): Intl.DateTimeFormat {
  try {
    const [locale] = Intl.getCanonicalLocales(lang);
    if (locale) return new Intl.DateTimeFormat(locale, LONG_DATE_OPTIONS);
  } catch (err) {
    if (!(err instanceof RangeError)) throw err; // only an invalid BCP-47 tag is expected
  }
  return new Intl.DateTimeFormat("en", LONG_DATE_OPTIONS);
}

// RFC-822 date for RSS <pubDate>. "" when unparseable.
export function toRfc822(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toUTCString();
}
