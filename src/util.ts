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
//
// "short" (v0.7.0) is the abbreviated month: "Jul 4, 2026" for en, "4 Jul
// 2026" for en-GB. `order` ("mdy" | "dmy") fixes the order regardless of the
// locale ("Jul 4, 2026" / "4 Jul 2026"), keeping the locale's month name; null
// = the locale's own order. Same determinism rules as "long".
export type DisplayDateFormat = "iso" | "long" | "short";
export type DisplayDateOrder = "mdy" | "dmy";
const LONG_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
};
const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { ...LONG_DATE_OPTIONS, month: "short" };

export function formatDisplayDate(
  iso: string,
  format: DisplayDateFormat | null | undefined,
  lang: string,
  order: DisplayDateOrder | null = null,
): string {
  if (format !== "long" && format !== "short") return toIsoDate(iso);
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const date = new Date(t);
  if (format === "long") return dateFormatter(lang, LONG_DATE_OPTIONS).format(date);
  const fmt = dateFormatter(lang, SHORT_DATE_OPTIONS);
  if (!order) return fmt.format(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => fmt.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  const [day, month, year] = [part("day"), part("month").replace(/\.$/, ""), part("year")];
  // A locale whose short month is numeric (ja, zh, ko: "7月") keeps its own
  // order — "7 4, 2026" would be wrong.
  if (!/\p{L}/u.test(month)) return fmt.format(date);
  return order === "mdy" ? `${month} ${day}, ${year}` : `${day} ${month} ${year}`;
}

function dateFormatter(lang: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    const [locale] = Intl.getCanonicalLocales(lang);
    if (locale) return new Intl.DateTimeFormat(locale, options);
  } catch (err) {
    if (!(err instanceof RangeError)) throw err; // only an invalid BCP-47 tag is expected
  }
  return new Intl.DateTimeFormat("en", options);
}

// RFC-822 date for RSS <pubDate>. "" when unparseable.
export function toRfc822(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toUTCString();
}
