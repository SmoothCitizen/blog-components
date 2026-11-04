// The site file (`config/site.json`) — one per customer repo. Written by the
// API's seed task (`CustomerBlogs::SiteFile`) from the tenant's brand profile
// and the site's authors; hand-editable afterwards. snake_case, like theme.json.

export interface Author {
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
  // Areas of expertise surfaced on the bio page and as `knowsAbout` in the
  // Person JSON-LD (an authority signal). Default []; ignored where empty.
  expertise: string[];
}

// Opt-in feature flags. Every flag defaults OFF, so a plain blog (a customer's
// own blog) renders exactly as before when the key is absent.
export interface SiteFeatures {
  // Turns on the sponsor-disclosure layer: the site-wide banner, the per-post
  // paid-placement callout, the footer attribution line, and the /disclosure
  // + /about editorial pages. A blog with paid placements must enable this.
  sponsorDisclosure: boolean;
}

// Values the sponsor-disclosure layer renders. Required (and validated) only
// when `features.sponsorDisclosure` is on — a disclosure page that named no
// publisher would itself be a compliance hole, so the build fails instead.
export interface SponsorConfig {
  // Legal operating entity that publishes the site — named on /about and
  // /disclosure and used as the JSON-LD `publisher`.
  publisherEntity: string;
  // The SINGLE attribution link target + its visible anchor text. Exactly one
  // link to this URL appears on the site (the footer), carrying
  // rel="nofollow sponsored".
  attributionUrl: string;
  attributionText: string;
  // Editorial-niche descriptor woven into the disclosure/about copy.
  niche: string | null;
  // Published correction / takedown inbox named on /disclosure + /about.
  contactEmail: string | null;
  // Page paths (defaults "/disclosure" and "/about").
  disclosurePath: string;
  aboutPath: string;
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
  features: SiteFeatures;
  // Present only when `features.sponsorDisclosure` is on; null otherwise.
  sponsor: SponsorConfig | null;
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
    expertise: Array.isArray(raw.expertise)
      ? raw.expertise.flatMap((v) => (typeof v === "string" && v.trim() ? [v.trim()] : []))
      : [],
  };
}

function parseFeatures(value: unknown): SiteFeatures {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return { sponsorDisclosure: raw.sponsorDisclosure === true };
}

// Validate the sponsor block ONLY when the feature is on. A missing publisher
// or attribution target fails the build (the compliance-safe failure mode:
// never ship a disclosure page with a blank publisher).
function parseSponsor(value: unknown, enabled: boolean): SponsorConfig | null {
  if (!enabled) return null;
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const where = "config/site.json sponsor";
  const attributionUrl = requiredString(raw, "attributionUrl", where);
  if (!/^https?:\/\//.test(attributionUrl)) {
    throw new Error(`[site] sponsor.attributionUrl '${attributionUrl}' must be an absolute http(s) URL`);
  }
  return {
    publisherEntity: requiredString(raw, "publisherEntity", where),
    attributionUrl,
    attributionText: optionalString(raw.attributionText) ?? attributionUrl.replace(/^https?:\/\//, ""),
    niche: optionalString(raw.niche),
    contactEmail: optionalString(raw.contactEmail),
    disclosurePath: optionalString(raw.disclosurePath) ?? "/disclosure",
    aboutPath: optionalString(raw.aboutPath) ?? "/about",
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

  const features = parseFeatures(s.features);

  return {
    site_name: requiredString(s, "site_name", where),
    canonical_hostname: hostname,
    language,
    description: optionalString(s.description),
    authors,
    features,
    sponsor: parseSponsor(s.sponsor, features.sponsorDisclosure),
  };
}

export function originFor(site: Pick<SiteConfig, "canonical_hostname">): string {
  return `https://${site.canonical_hostname}`;
}

export function authorBySlug(site: Pick<SiteConfig, "authors">, slug: string): Author | undefined {
  return site.authors.find((a) => a.slug === slug);
}
