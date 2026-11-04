# Changelog

All notable changes to the blog components package. Versions follow
[semver](https://semver.org/): a customer blog repo pins one exact tag, so

- **patch** — a fix that changes no contract (CSS fix, escaping fix, markup fix);
- **minor** — something new and optional (a component, an optional frontmatter or theme key);
- **major** — anything a pinned repo must adapt to (a required key, a renamed export,
  a changed file layout, a changed visibility rule).

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
