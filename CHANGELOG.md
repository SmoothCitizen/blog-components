# Changelog

All notable changes to the blog components package. Versions follow
[semver](https://semver.org/): a customer blog repo pins one exact tag, so

- **patch** — a fix that changes no contract (CSS fix, escaping fix, markup fix);
- **minor** — something new and optional (a component, an optional frontmatter or theme key);
- **major** — anything a pinned repo must adapt to (a required key, a renamed export,
  a changed file layout, a changed visibility rule).

## [0.6.1] — 2026-11-09

Patch: two layout fixes, no contract change (no key, prop default or export
removed). Stylesheet output changes ONLY for a `bar` header theme and for a
theme with a `language_switch` nav entry; every other theme's `themeCss` is
unchanged. Refreshed fixtures: `test/fixtures/v0_3_1-themecss.txt` and the
`full:themeCss` entry of `test/fixtures/v0_5_0-markup.json` (both bar themes;
three bar rules each). All other fixtures are untouched.

- **Language switch is tappable and marks the current language.** The switch
  a post page renders above a translated post's title used to have no styles
  (its rules were scoped to the header nav), so its codes ran together
  ("ENES"). It now renders separated pill entries, each at least 44px, with
  the current language filled (ink on bg) and still `aria-current="true"`.
  Because that switch appears on any site with translated posts, whatever the
  theme, it carries inline styles (new `LanguageSwitch` prop
  `placement: "nav" | "post"`, default `"nav"`; `PostArticle` passes
  `"post"`) instead of adding rules to every site's stylesheet. The header-nav
  switch (still emitted only when the theme has a `language_switch` entry)
  wraps, gives every entry a 44px tap target, and marks the current language
  with bold text and an accent underline (a filled pill in pill style)
  instead of the dimmed color that read as disabled.
- **`bar` header wraps on phones.** The bar's row and its nav now
  `flex-wrap`, so a phone with several nav entries plus a language pill
  stacks the nav under the logo instead of scrolling the page sideways
  (row gap 12px; nav gap 4px × 16px under 800px). A row that fits is
  unchanged.

## [0.6.0] — 2026-11-09

Minor: two markdown fixes and optional design knobs. A config that sets none
of the new keys (or sets each to its default) renders byte-identically to
v0.5.0 — `themeCss`, header, footer, index, list, post and author markup are
asserted against `test/fixtures/v0_5_0-markup.json`, captured from the v0.5.0
components; the v0.2.0 / v0.3.1 fixtures still hold.

- **Markdown: inline code + GFM tables (fix).** `` `x` `` renders `<code>`
  (content literal — no emphasis/links inside, HTML escaped; ``` `` ``` runs
  for a backtick inside). GFM pipe tables (header row + delimiter row with the
  same cell count, `:--`/`:-:`/`--:` alignment, `\|` escapes, short rows
  padded, extra cells dropped) render `<table>` with `thead`/`tbody` inside a
  focusable `role="region"` wrapper (`.table-wrap`) that scrolls horizontally
  on a phone; cells use the existing `.post-body table/th/td` rules. A link to
  a `javascript:`/`data:`/`vbscript:` URL now renders as its plain label.
  `MarkdownBody` takes an optional `classPrefix`. New exports `MarkdownTable`,
  `renderInline`, `isSafeLinkHref`, `splitTableRow`, `tableAlignments`,
  `TABLE_MIN_COLUMN_EM`; `MarkdownBlock` gains a `table` member.
- **Post cards (`post_list_variant: "cards"`, `post_list_cta_label`).** Raised
  cards with date, reading time, title (one stretched link per card),
  excerpt, byline and an `aria-hidden` CTA (default `Read →`). New
  `PostCards`, `readingMinutes`, `bodyText`.
- **Background motif (`pattern`, `pattern_image_key`).** `dots` / `grid` /
  `pinstripe` / `herringbone` in pure CSS behind the index hero and the post
  header, colored by mixing the guarded accent into the page bg and stepping
  the mix down until the ink and muted text keep their contrast
  (`patternInk`); or a custom svg/png/webp under a surface veil sized so text
  keeps its contrast over any image pixel (`patternVeilAlpha`). The post title
  block is wrapped in `<header class="post-header">` only when a motif is set.
- **Typography.** `heading_weight` (300–900), `heading_case` / `nav_case` /
  `logo_case` (`uppercase`) with a validated `letter_spacing`, and
  `meta_style: "mono"` + `mono_font` for metadata and small labels.
- **Labels.** `hero.eyebrow`, `index_label` (divider above the index list),
  `footer_tagline`.
- **Post body.** `drop_cap`, `list_marker` (`dash` / `accent`),
  `heading_accent`.
- **Dates (`date_format: "long"`).** `formatDisplayDate` — `Intl` long date in
  the post's language, read in UTC with an explicit locale (no build-machine
  locale/time-zone drift).
- **Chrome.** `logo_mark_key` (small image before the text wordmark, header +
  footer); `header_align: "content"` (header row on the content column).
- **Component props.** `PostList`, `PostArticle` and `AuthorProfile` take an
  optional `theme` (type `PostTheme`); without it they render the v0.5.0
  markup. Pass it to enable cards, long dates and the post-header motif.

## [0.5.0] — 2026-11-09

Minor: two new optional theme keys. A config that sets neither renders
byte-identically to v0.4.0 (`themeCss` output, header markup and the index
heading are unchanged; the v0.2.0 / v0.3.1 fixtures still hold).

- **Index hero (`hero`).** New optional theme key
  `{ title, subtitle?, image_key?, image_alt?, cta?: { label, href }, align? }`.
  When set, page 1 of the blog index opens with a `<section class="index-hero">`
  whose `<h1>` is the hero title — it REPLACES the brand-name `<h1>` on that
  page, so the index still has exactly one `<h1>`. Later index pages keep the
  brand-name heading. `title` is required (<= 120 chars) or the whole hero is
  dropped; `subtitle` (<= 300), `image_key` (a path under `public/`, image
  extension), `image_alt` (default `""` = decorative) and `cta` (`href`
  validated like a nav href; an external target gets `rel="noopener"`) each
  degrade on their own; `align` is `"left"` (default) or `"center"`. Styled
  only with the surface/accent tokens (`--panel`, `--line`, `--ink`, `--muted`,
  `.btn` on the guarded accent), so it follows a dark `surface`; stacks on
  phones, and a left-aligned hero with an image goes two-column from 720px.
  New exports `IndexHero`, `parseHero`.
- **Self-hosted fonts (`font_files`).** New optional theme key
  `[{ family, src, weight?, style? }]` (max 12). Each valid entry emits an
  `@font-face` rule (`font-display: swap`) whose `src` is served from the
  site's own `public/` dir — no third-party font origin. Use the family by
  naming it in `fonts.heading` / `fonts.body`. Validation: `family` is
  letters/digits/spaces/`-`/`_` only; `src` must be a relative path under the
  site (one leading `/` tolerated) ending in `.woff2` or `.woff` — `..`/`.`
  segments, `//`, any scheme or absolute URL, quotes, parens, whitespace and
  other CSS-significant characters are rejected; `weight` is `100`–`900` in
  steps of 100, `normal`, `bold` or a variable range like `"100 900"`
  (default `400`); `style` is `normal` (default) or `italic`. An invalid entry
  is dropped on its own. New exports `fontFaceCss`, `parseFontFiles`,
  `safePublicPath`.

## [0.4.0] — 2026-11-04

Minor (0.x): multilingual publishing + rendering. A single-language blog that
sets none of the new keys renders byte-identically to v0.3.1 (the captured
`test/fixtures/v0_3_1-*` assert header + `themeCss`; the v0.2.0 fixtures still
hold). The one contract change is the translation-family key (see below) —
safe because no pinned repo carries the old key yet.

- **Per-language routes.** A post whose `lang` is the site default stays at
  `/posts/<slug>` (NO change). A post in any other language is served at
  `/<lang>/posts/<slug>`, and each non-default language that has ≥1 post also
  gets a `/<lang>/` index and a `/<lang>/feed.xml`. New helpers `postPathFor`,
  `postUrlFor`, `langIndexPath`, `langFeedPath`; the default language is the
  site config `language`.
- **Translation families (`translationOf`).** New optional post frontmatter
  key `translationOf` = the ROOT post's slug. A root carries none; each variant
  points back at the root slug, so a post's family is every live post that
  resolves to the same root slug. **Replaces the former `translationKey`** (a
  shared opaque key on every member). New helpers `familyRootSlug`,
  `translationFamily`, `postLang`, `isDefaultLang`, `nonDefaultLanguages`,
  `languagesPresent`, `postsInLanguage`.
- **hreflang + x-default.** `hreflangAlternates` now emits one alternate per
  language in the family plus an `x-default` → the default-language version (or
  the family root when no default-language sibling is live). `sitemapXml`
  carries the matching `xhtml:link` alternates and the per-language index/feed
  URLs; `rssXml` takes an optional `{ lang }` for a per-language feed.
- **Direction.** New `dirForLang` / `isRtlLang` / `RTL_BASE_LANGS` (ar/he/fa/ur,
  matched on the base subtag; extend the one array). `htmlAttributes(lang,
  theme)` now sets `dir` from the page language and accepts a bare BCP-47 tag
  (the `{ language }` object shape still works).
- **Language switch (`nav_links` type `language_switch`).** New optional nav
  entry `{ "type": "language_switch", "style": "pill"? }` renders the
  `LanguageSwitch` component (label = language code uppercased, e.g. `ES`);
  hidden when the site has a single language. Plain nav entries are unchanged
  (they default to `type: "link"`). `SiteHeader` / `SiteShell` take a
  `languageSwitch` prop; `PostArticle` takes one too (the post's siblings).
- **Logo link target (`logo_href`).** New optional theme key: when set, the
  header logo/brand link points there instead of `/` (validated exactly like a
  nav href — `/`-relative or `https://` only; an external target gets
  `rel="noopener"`). The aria-label stays `"<brand> home"`. Unset = `/`.

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
