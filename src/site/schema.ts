// The site file (`config/site.json`) — one per customer repo. Written by the
// API's seed task (`CustomerBlogs::SiteFile`) from the tenant's brand profile
// and the site's authors; hand-editable afterwards. snake_case, like theme.json.

export interface Author {
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
}

export interface SiteConfig {
  site_name: string;
  // Bare hostname the blog is served on (no scheme, no path), e.g.
  // "blog.example.com". Every canonical URL, the sitemap, the feed and the
  // JSON-LD are built from it.
  canonical_hostname: string;
  // BCP-47 default language of the site, e.g. "en" or "ja".
  language: string;
  description: string | null;
  authors: Author[];
}

// A bare hostname: dot-separated RFC-1123 labels, lowercase, no scheme/port/path.
const HOSTNAME = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;
const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const requiredString = (raw: Record<string, unknown>, key: string, where: string): string => {
  const value = raw[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`[site] ${where} is missing required key '${key}'`);
  }
  return value.trim();
};

const optionalString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

function parseAuthor(value: unknown, index: number): Author {
  if (typeof value !== "object" || value === null) {
    throw new Error(`[site] authors[${index}] must be an object`);
  }
  const raw = value as Record<string, unknown>;
  const where = `authors[${index}]`;
  const slug = requiredString(raw, "slug", where);
  if (!SLUG.test(slug)) {
    throw new Error(`[site] ${where}.slug '${slug}' must be lowercase words joined by hyphens`);
  }
  return {
    slug,
    name: requiredString(raw, "name", where),
    title: optionalString(raw.title),
    bio: optionalString(raw.bio),
  };
}

// Validate a raw site.json. Throws (fails the build) on anything that would
// produce wrong canonical URLs or an author-less blog: a published post needs a
// real byline (E-E-A-T), so at least one author is required.
export function parseSiteConfig(raw: unknown): SiteConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("[site] config/site.json must be a JSON object");
  }
  const s = raw as Record<string, unknown>;
  const where = "config/site.json";
  const hostname = requiredString(s, "canonical_hostname", where).toLowerCase();
  if (!HOSTNAME.test(hostname)) {
    throw new Error(
      `[site] canonical_hostname '${hostname}' must be a bare hostname (no scheme, port or path)`,
    );
  }
  const language = requiredString(s, "language", where);
  if (!LANGUAGE.test(language)) {
    throw new Error(`[site] language '${language}' must be a BCP-47 tag such as "en" or "ja"`);
  }
  if (!Array.isArray(s.authors) || s.authors.length === 0) {
    throw new Error("[site] config/site.json must list at least one author");
  }
  const authors = s.authors.map(parseAuthor);
  const seen = new Set<string>();
  for (const author of authors) {
    if (seen.has(author.slug)) throw new Error(`[site] duplicate author slug '${author.slug}'`);
    seen.add(author.slug);
  }

  return {
    site_name: requiredString(s, "site_name", where),
    canonical_hostname: hostname,
    language,
    description: optionalString(s.description),
    authors,
  };
}

export function originFor(site: Pick<SiteConfig, "canonical_hostname">): string {
  return `https://${site.canonical_hostname}`;
}

export function authorBySlug(site: Pick<SiteConfig, "authors">, slug: string): Author | undefined {
  return site.authors.find((a) => a.slug === slug);
}
