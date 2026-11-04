# Changelog

All notable changes to the blog components package. Versions follow
[semver](https://semver.org/): a customer blog repo pins one exact tag, so

- **patch** — a fix that changes no contract (CSS fix, escaping fix, markup fix);
- **minor** — something new and optional (a component, an optional frontmatter or theme key);
- **major** — anything a pinned repo must adapt to (a required key, a renamed export,
  a changed file layout, a changed visibility rule).

## 0.3.1

- `bar` header: nav links are vertically centred with the logo and any pill link (44px tap targets).

## [0.3.0] — 2026-11-04

Minor: new optional theme surfaces only. A config that sets none of the new keys
renders byte-identically to v0.2.0 (`themeCss` output and header markup are
byte-for-byte unchanged — asserted by `test/surface-nav.test.ts` against the
captured v0.2.0 fixtures in `test/fixtures/`).

- **Page-surface colors (`surface`).** New optional theme key
  `surface: { bg, ink, muted, line }` (four hexes). When set, every page-level
  color (`--bg` / `--ink` / `--muted` / `--line`, plus the derived panel and the
  dimmed body-ink used by excerpts/blockquotes) comes from it instead of the
  hard-coded light defaults, letting a site match a dark brand site. The accent
  contrast guard and the accent/line tints are computed against the surface bg
  (not hard-coded white), so the accent stays WCAG-AA readable and the tints mix
  toward the surface (a dark site gets dark tints). Each hex is re-validated with
  the strict normalizer; if any is invalid, or the ink fails AA (< 4.5:1) on the
  bg, the whole surface is dropped and the v0.2.0 light defaults are used rather
  than shipping unreadable text. A low-luminance bg also emits
  `color-scheme: dark` on `:root`.
- **Header nav links (`nav_links`).** New optional
  `nav_links: [{ label, href, style? }]` (max 6). When non-empty it REPLACES the
  default Home/About/Authors nav. `href` must be `/`-relative or `https://`
  (`javascript:`/`data:`/`http:`/protocol-relative are rejected at parse time);
  external links get `rel="noopener"`. `label` is plain text, <= 30 chars.
  `style: "pill"` renders a bordered pill (1px `currentColor`, 30px radius).
- **Logo sizing (`logo_width`).** New optional integer px (60–320). When set the
  header logo renders at that width with `height:auto` (the intrinsic height
  attribute is dropped); unset keeps the default 40px height.
- **Header variant `bar`.** New fourth `header_variant` — a full-bleed bar (logo
  left, nav right, vertically centered, surface-bg band with a `--line` bottom
  border, 32px nav gap, hover underline) with responsive padding/gaps and a
  ≤560px logo shrink when `logo_width` is set.

## [0.2.0] — 2026-11-04

Minor: new optional surfaces only. A blog that pins v0.1.0 and upgrades without
setting any new key renders identically (the new `features` default to off,
`bodyFormat` auto-detects to the existing HTML-body behaviour, and the new theme
fields default to the existing look + empty class prefix).

- **Body rendering.** `PostArticle` renders the body as HTML or markdown. When
  `bodyFormat` is absent it is **auto-detected** from the body (`resolveBodyFormat`:
  a body starting with an HTML block tag is HTML, else markdown), so a hand-written
  markdown post renders correctly even without the key and a generated HTML body
  still renders as HTML; an explicit `bodyFormat` overrides detection. New
  `MarkdownBody` + `Figure` + pure `parseMarkdownBlocks` render a small,
  dependency-free markdown grammar. New `PostBody` export. The package is NOT a
  sanitizer — bodies must be sanitized server-side before rendering.
- **Per-site design + markup namespacing.** New theme fields: custom `fonts`
  (heading/body stacks overriding the preset), `radius`, `space` (vertical
  rhythm), `header_variant` (classic / centered / compact) and `post_variant`
  (classic / wide / narrow) — three independent layout axes alongside the
  existing `layout_variant`. New `class_prefix` namespaces every rendered class
  name + the matching stylesheet selectors (`classer`, `prefixStylesheet`), so
  independently-published sites do not share byte-identical markup. All default
  to the prior look / empty prefix.
- **Sponsor-disclosure layer (opt-in, `features.sponsorDisclosure`).** New
  `config/site.json` keys `features` and `sponsor`; new `DisclosureBanner`,
  `PaidPlacementCallout`, `SponsorAttribution` components and the `showSponsorBanner`
  / `showPaidPlacement` predicates; the site chrome (`SiteShell` / `SiteHeader`
  / `SiteFooter`) mounts the banner, the single `rel="nofollow sponsored"`
  footer attribution and a Disclosure nav entry when the feature is on. New
  `disclosurePageMarkdown` / `aboutPageMarkdown` + `buildEditorialPlaceholders`
  / `substitutePlaceholders` supply the /disclosure + /about editorial copy
  from one place.
- **Post frontmatter.** New optional keys `bodyFormat`, `paidBrands`,
  `otherBrands`; post `schemaVariant` now also accepts `"Review"`
  (`PostSchemaVariant` / `POST_SCHEMA_VARIANTS`).
- **JSON-LD.** A `"Review"` post emits a schema.org `Review` node; on a
  sponsor-disclosure site the publisher is the configured publisher entity
  (`sponsorOrganizationNode`), and the author `Person` node carries `knowsAbout`
  (expertise) and `worksFor`.
- **Authors.** `Author` gains an optional `expertise` list, surfaced on the bio
  page and as `knowsAbout`.

## [0.1.0] — 2026-11-04

First release.

- Site chrome: `SiteShell`, `SiteHeader`, `SiteFooter`, `ThemeStyle`, `JsonLd`, `htmlAttributes`.
- Pages: `PostIndex` + `Pagination`, `PostList`, `PostArticle`, `AuthorsIndex`, `AuthorProfile`,
  `AboutContent`, `FaqBlock`.
- Theme: `config/theme.json` schema (`parseTheme`), the WCAG-AA-guarded palette (same derivation
  as the hosted renderer), font pairs (system stacks, no external fonts), three layouts
  (journal / grid / minimal), post-body typography.
- Site: `config/site.json` schema (`parseSiteConfig`) — name, canonical hostname, language, authors.
- Content (`./content` entry, Node only): `content/posts/*.mdx` loader (YAML frontmatter + HTML
  body), frontmatter validation, and the visibility rule — a post is built only when
  `status` is `"published"` AND `publishAt` <= build time.
- SEO: Next.js metadata builders (canonical, Open Graph, Twitter, RSS discovery, hreflang),
  JSON-LD (Article/BlogPosting, Person, Organization, Blog, FAQPage), `sitemapXml`, `rssXml`,
  `robotsTxt`; hreflang alternates computed from live posts sharing a `translationKey`.
