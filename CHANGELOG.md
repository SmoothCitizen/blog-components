# Changelog

All notable changes to the blog components package. Versions follow
[semver](https://semver.org/): a customer blog repo pins one exact tag, so

- **patch** — a fix that changes no contract (CSS fix, escaping fix, markup fix);
- **minor** — something new and optional (a component, an optional frontmatter or theme key);
- **major** — anything a pinned repo must adapt to (a required key, a renamed export,
  a changed file layout, a changed visibility rule).

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
