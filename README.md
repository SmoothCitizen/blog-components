# blog-components

Design components for a blog that lives in its own repo: layout chrome, post page, index and
pagination, author pages, about page, FAQ block, typography, the WCAG-guarded palette, SEO
metadata, JSON-LD, sitemap, RSS and robots. Consumed by the blog templates in this monorepo
(both Next.js 14 static exports) so a front-end change lands in one place and reaches every
blog built from either template.

The package is TypeScript source with no build step. The consuming app lists it in
`transpilePackages`.

## Consuming a pinned version

A blog repo outside this monorepo installs a tagged release from the **public** components
repo as a git dependency — no registry, no auth, works on Cloudflare Pages:

```json
"dependencies": {
  "blog-components": "github:<owner>/<repo>#v0.1.0"
}
```

Inside the monorepo the template uses `workspace:*`; `CustomerBlogs::SeedRepo` (API) rewrites it
to the pinned git spec when it seeds a customer repo.

To move a repo to a new version, change the tag in its `package.json` (one commit; Pages
rebuilds). A repo can stay on a known-good tag indefinitely.

## Releasing

1. Change the package, with tests (`pnpm --dir packages/blog-components test`).
2. Bump `version` in `package.json` and add a `## [x.y.z]` entry to `CHANGELOG.md`
   (semver rules at the top of the changelog). Merge.
3. From a clean checkout of the merged commit:

   ```bash
   BLOG_COMPONENTS_REPO=<owner>/<repo> \
   BLOG_COMPONENTS_DENYLIST_FILE=<local file, never committed> \
   scripts/release-blog-components.sh x.y.z          # dry run
   # then the same with --push
   ```

   The script checks the version + changelog, runs lint/typecheck/tests, exports the committed
   package, scans it for secret-shaped strings and denylisted terms, commits it to the public
   repo and tags `vx.y.z`. Tags are immutable: a bad release is fixed by a new version.

## Contracts

- `config/theme.json` — `src/theme/schema.ts`. The same keys the API stores for a blog theme;
  the API writes this file when a theme is saved.
- `config/site.json` — `src/site/schema.ts`.
- `content/posts/<slug>.mdx` — `src/content/types.ts`. YAML frontmatter + body. When `bodyFormat`
  is absent the renderer auto-detects it from the body (a leading HTML block tag → HTML, else
  markdown); set `bodyFormat: "html" | "markdown"` to override. An HTML body is rendered verbatim;
  a markdown body goes through `MarkdownBody`.

### Body safety — bodies MUST be sanitized before they reach this package

An HTML body is injected verbatim (`dangerouslySetInnerHTML`). **This package is NOT a
sanitizer and performs no sanitization.** Every body it renders MUST already be sanitized by the
producer that wrote it — the trust boundary is server-side (the API sanitizes generated bodies at
the publish boundary). Never pass an unsanitized or user-supplied body to `PostArticle` /
`PostBody`.

## Per-site design & markup namespacing

`config/theme.json` (`src/theme/schema.ts`) carries each site's look so it is not identical to
every other site built from the same package: `palette`, `font_pair` (or custom `fonts.heading` /
`fonts.body` stacks), `radius`, `space` (vertical rhythm), and three independent layout axes —
`layout_variant` (post list: journal / grid / minimal), `header_variant` (classic / centered /
compact / **bar**) and `post_variant` (classic / wide / narrow). `class_prefix` namespaces every
rendered class name and the matching stylesheet selectors (`classer` + `prefixStylesheet`), so two
sites do not ship byte-identical markup. Every field is optional and defaults so that a config
written for v0.1.0 renders byte-identically (empty prefix, default variants).

### v0.3.0 theme keys — match an existing brand site (all optional)

A site that needs to match an existing brand's header and a dark page sets these; a config that
omits them all renders byte-identically to v0.2.0.

| Key | Type | Notes |
|---|---|---|
| `surface` | `{ bg, ink, muted, line }` (hexes) | Page-level colors. When set, `--bg`/`--ink`/`--muted`/`--line` (and the derived panel + dimmed body-ink) come from it; the accent guard + tints are computed against `surface.bg`, so the accent stays AA-readable and tints mix toward the surface. Each hex is re-validated; if any is invalid or `ink` fails AA (< 4.5:1) on `bg`, the whole surface is dropped (light v0.2.0 defaults). A low-luminance `bg` also adds `color-scheme: dark`. |
| `nav_links` | `[{ label, href, style? }]`, max 6 | REPLACES the default Home/About/Authors nav. `href` must be `/`-relative or `https://` (`javascript:`/`data:`/`http:`/`//` rejected); external links get `rel="noopener"`. `label` is plain text, ≤ 30 chars. `style: "pill"` renders a bordered pill. |
| `logo_width` | integer px, 60–320 | Header logo renders at this width with `height:auto`; unset keeps the default 40px height. |
| `header_variant: "bar"` | enum value | Full-bleed header (logo left, nav right, surface-bg band, `--line` bottom border); the other three variants are unchanged. |

### v0.4.0 keys — multilingual + logo link (all optional)

A blog that sets none of these renders byte-identically to v0.3.1.

| Key | Type | Notes |
|---|---|---|
| `logo_href` | `/`-relative or `https://` | Target for the header logo/brand link; unset = `/` (home). Validated like `nav_links.href` (`javascript:`/`data:`/`http:`/`//` rejected). An external `https://` target gets `rel="noopener"`. The link's aria-label stays `"<brand> home"`. |
| `nav_links[].type: "language_switch"` | enum value | A nav entry that renders the language switcher (links/pill to the site's languages or a post's siblings) instead of a plain link. Carries no `label`/`href`. Hidden when the site has a single language. Plain entries default to `type: "link"` and are unchanged. Each entry is a ≥ 44px tap target; the current language is marked (`aria-current`, bold + accent underline, or a filled pill). The per-post switch above a translated post's title is styled inline, so it works whether or not the theme has this entry (v0.6.1). |

### v0.5.0 keys — index hero + self-hosted fonts (all optional)

A blog that sets neither renders byte-identically to v0.4.0.

| Key | Type | Notes |
|---|---|---|
| `hero` | `{ title, subtitle?, image_key?, image_alt?, cta?: { label, href }, align?: "left" \| "center" }` | Page 1 of the index opens with a `<section>` whose `<h1>` is `title` (it replaces the brand-name `<h1>` there — still one `<h1>` per page). `title` required (≤ 120 chars) or no hero; `subtitle` ≤ 300; `image_key` is a path under `public/` with an image extension; `image_alt` defaults to `""` (decorative); `cta.href` is validated like a nav href. Styled from the surface/accent tokens, so dark surfaces work unchanged. |
| `font_files` | `[{ family, src, weight?, style? }]`, max 12 | One `@font-face` (`font-display: swap`) per entry, `src` served from the site's own `public/` dir. Use the family in `fonts.heading` / `fonts.body`. `src` must be a relative path ending `.woff2`/`.woff` (no `..`, no `//`, no scheme/absolute URL, no CSS-significant characters); `weight` `100`–`900` / `normal` / `bold` / a range like `"100 900"` (default `400`); `style` `normal` / `italic`. |

```json
{
  "brand_name": "Example Blog",
  "hero": {
    "title": "Practical guides from Example Blog",
    "subtitle": "Short, tested how-tos.",
    "image_key": "images/hero.webp",
    "image_alt": "",
    "cta": { "label": "Start here", "href": "/posts/getting-started" },
    "align": "left"
  },
  "font_files": [
    { "family": "Example Sans", "src": "fonts/example-sans.woff2", "weight": "100 900", "style": "normal" }
  ],
  "fonts": { "heading": "\"Example Sans\", system-ui, sans-serif", "body": null }
}
```

### v0.6.0 keys — design knobs (all optional)

A blog that sets none of these (or sets each to its default) renders byte-identically to v0.5.0
(asserted against `test/fixtures/v0_5_0-markup.json`). Every key is validated on its own: an
invalid value is dropped (the default is used) and never throws; enum keys are allow-listed and
every value that reaches the stylesheet is pattern-checked, so a values file cannot inject CSS.

| Key | Values (default first) | Notes |
|---|---|---|
| `post_list_variant` | `"list"` \| `"cards"` | `cards`: raised cards — date + reading time (`N min read`, from the body word count; unspaced scripts counted per character), title (one stretched link per card), excerpt, byline, and a visual CTA. Overrides `layout_variant` for the list. |
| `post_list_cta_label` | text ≤ 30 chars | The card CTA; unset = `Read →`. Rendered `aria-hidden` (the title link names the post). |
| `pattern` | `"none"` \| `"dots"` \| `"grid"` \| `"pinstripe"` \| `"herringbone"` | Pure-CSS motif behind the index hero and the post header (the post title block is wrapped in `.post-header` only when a motif is set). Drawn in the guarded accent mixed into the page bg, stepped down until the ink and muted text keep their contrast on it (dropped if nothing passes). |
| `pattern_image_key` | path under `public/` (`.svg` / `.png` / `.webp`) | A custom motif instead of `pattern` (wins when both are set). Validated by `safePublicPath`; drawn under a surface-colored veil whose alpha is computed so text keeps its contrast over any image pixel. |
| `heading_weight` | `300`–`900`, step 100 | Unset = the browser's heading weight. |
| `heading_case` / `nav_case` / `logo_case` | `"none"` \| `"uppercase"` | Headings (h1–h4) / header nav / text wordmark (header + footer). |
| `letter_spacing` | `0` or a length like `"0.04em"`, `"-0.5px"`, `".1em"` (em/rem/px, ≤ 2 integer digits, ≤ 3 decimals) | Applied wherever a `*_case` is `uppercase`; alone it does nothing. |
| `meta_style` | `"default"` \| `"mono"` | `mono`: post metadata, the index label, the hero eyebrow and the card CTA use `mono_font`. |
| `mono_font` | font stack (same validation as `fonts`) | Unset = a system monospace stack. Used only with `meta_style: "mono"`. |
| `hero.eyebrow` | text ≤ 60 chars | Small label above the hero title. |
| `index_label` | text ≤ 40 chars | A divider label (e.g. `Latest`) above the index post list. |
| `footer_tagline` | text ≤ 120 chars | A line in the footer above the copyright. |
| `drop_cap` | boolean (`false`) | First letter of the post body's first paragraph, in the accent. Off on rtl pages. |
| `list_marker` | `"default"` \| `"dash"` \| `"accent"` | Post-body list bullets: an en dash, or accent-colored markers. |
| `heading_accent` | boolean (`false`) | A short accent tick above each post-body h2. |
| `date_format` | `"iso"` \| `"long"` | `long` = `Intl` long date in the page (post) language, read in UTC — e.g. `November 9, 2026` (en), `9 November 2026` (en-GB), `9 de noviembre de 2026` (es). Deterministic: the locale is always passed explicitly. |
| `logo_mark_key` | path under `public/` (image extension) | A small image before the text wordmark in the header and footer (decorative, `alt=""`); not shown when `logo_key` replaces the wordmark. |
| `header_align` | `"full"` \| `"content"` | `content` puts the header row on the content column (pulls the full-bleed `bar` in; the nav wraps under the brand on a phone). |

**Pass `theme` to the list/post components.** `PostList`, `PostArticle` and `AuthorProfile` take
an optional `theme` prop (`PostIndex` and the chrome already receive it). Without it they render
the v0.5.0 markup, so `post_list_variant`, `date_format` and the post-header motif only take effect
on pages that pass it:

```tsx
<PostList posts={posts} site={site} theme={theme} />
<PostArticle post={post} site={site} theme={theme} />
<AuthorProfile author={author} posts={posts} site={site} theme={theme} />
```

```json
{
  "brand_name": "Example Blog",
  "post_list_variant": "cards",
  "pattern": "dots",
  "heading_case": "uppercase",
  "letter_spacing": "0.04em",
  "meta_style": "mono",
  "index_label": "Latest",
  "drop_cap": true,
  "list_marker": "dash",
  "date_format": "long",
  "hero": { "eyebrow": "Field notes", "title": "Practical guides from Example Blog" }
}
```

### v0.7.0 keys — closer matches to an existing design (all optional)

A blog that sets none of these (or sets each to its default) renders byte-identically to v0.6.1
(asserted against `test/fixtures/v0_6_1-markup.json`, captured from v0.6.1 with every v0.6.0 knob
in use, and against the v0.5.0 fixture). Same validation rules as v0.6.0: every key is checked on
its own, an invalid value is dropped (the default is used) and never throws, enums are
allow-listed, colours are strict hexes, lengths are pattern-checked and numbers are bounded — and
the stylesheet layer re-validates all of them, so a values file cannot inject CSS. The motif,
scrim, wash, inverse hero and eyebrow colours are contrast-guarded (see the notes).

**Motifs + hero / post header**

| Key | Values (default first) | Notes |
|---|---|---|
| `pattern_strength` | `"subtle"` \| `"medium"` \| `"bold"` | `subtle` = the v0.6.0 guarded motif. `medium`/`bold` draw the motif much stronger (built-in weight ×2.5 / ×4.5, capped; image opacity 0.5 / 0.9) and put a **text-safe scrim** behind the text block (`.index-hero-text`, `.post-header-text`): the surface colour at the smallest alpha that keeps the ink + muted text readable over the worst motif pixel. |
| `pattern_position` | `"cover"` \| `"top-left"` \| `"top-right"` \| `"center"` \| `"top"` | Where the motif shows (a CSS mask fades it out elsewhere). `top` is a band along the top edge. |
| `post_header_pattern` | a `pattern` value, or unset | The post-header motif; unset = the hero's motif, `"none"` = no motif on the post header. |
| `post_header_pattern_image_key` | path under `public/` (`.svg` / `.png` / `.webp`) | A custom image for the post header only (wins over `post_header_pattern`). |
| `hero_wash` | `{ from: hex, to: hex, angle?: 0–360 }` (angle `135`) | A soft two-colour gradient behind the hero and the post header. Each colour is mixed into the surface (≤ 30%), stepped down until the text keeps its contrast; skipped if nothing passes. Both hexes required. |
| `hero_style` | `"panel"` \| `"flat"` \| `"inverse"` | `flat`: no panel or box, a bottom hairline (side padding drops when there is no motif or wash). `inverse`: the hero and post header use the page ink as background and the page bg as text (AA by the surface guard), with a re-guarded accent and muted. |
| `hero.title_accent` | text ≤ 80 chars | An italic phrase in the accent appended to the hero title. |
| `post_header_eyebrow` | text ≤ 40 chars | A small label above every post title. |
| `post_header_align` | `"left"` \| `"center"` | Centers the post title block (and the divider under it). |
| `post_meta_layout` | `"classic"` \| `"split"` | `split`: date (+ reading time) as a label above the title, the byline under the description. |
| `description_style` | `"normal"` \| `"italic"` | The post description (dek). |
| `divider` | `"accent"` \| `"none"` \| `"line"` \| `"ticks"` \| `"cross"` | The rule under page titles: the accent bar, nothing, a hairline, or a tick / cross-hatch ornament. |

The post title block is wrapped in `<header class="post-header">` when a motif, wash,
`inverse` style, eyebrow, centered align or split meta needs it (`postHeaderMode`).

**Post lists + metadata**

| Key | Values (default first) | Notes |
|---|---|---|
| `post_list_variant` | adds `"numbered"` | An `<ol>` with large decorative `01`/`02`… numbers (`aria-hidden`), the date as a small label, title, excerpt and byline. Numbering restarts per page. |
| `post_list_columns` | `1` \| `2` (unset = auto-fill) | Cards (and the `grid` layout). `2` drops to one column under 640px. |
| `card_meta` | `"date_reading"` \| `"author_date"` \| `"date_author"` | `date_reading` = the v0.6.0 card. The other two put author + date in one row and drop the separate byline row. |
| `card_meta_position` | `"top"` \| `"bottom"` | Meta row above the title or under the excerpt. |
| `card_style` | `"raised"` \| `"flat"` | `flat`: no shadow / lift; hover tints the border. |
| `card_cta_position` | `"bottom"` \| `"inline"` | `inline`: the CTA sits at the end of the last meta row. |
| `card_feature_first` | boolean (`false`) | The first card spans the full row, with a larger title. |
| `card_feature_label` | text ≤ 24 chars | A small label on the featured card. |
| `excerpt_lines` | `2`–`6` | Clamps card / numbered / journal / grid excerpts. |
| `byline_prefix` | text ≤ 12 chars | E.g. `By` before the author name (post, card and numbered bylines). |
| `byline_order` | `"date_author"` \| `"author_date"` | The post byline order. |
| `meta_separator` | `"dot"` \| `"slash"` \| `"pipe"` | ` · ` / ` / ` / ` \| ` between metadata items. |
| `meta_case` | `"none"` \| `"uppercase"` | Post + list metadata; tracking = `label_tracking` (else `.06em`). |
| `author_style` | `"accent"` \| `"ink"` \| `"underline"` \| `"italic"` | The author name in metadata (`italic` = italic list bylines). |
| `post_title_color` | `"accent"` \| `"ink"` | Post titles in the list (hover goes to the accent). |
| `date_format` | adds `"short"` | Abbreviated month in the page language: `Jul 4, 2026` (en), `4 Jul 2026` (en-GB). |
| `date_order` | `"mdy"` \| `"dmy"` (unset = the locale's) | Forces the order for `short`; a locale with a numeric month (ja, zh, ko) keeps its own. |

**Labels, header, footer**

| Key | Values (default first) | Notes |
|---|---|---|
| `eyebrow_color` | `"muted"` \| `"accent"` \| `"accent2"` | Hero eyebrow, post-header eyebrow, tagline-above. Guarded to AA against the bg, panel and header/footer tints (and separately inside an `inverse` hero). |
| `accent_color_2` | hex | The second accent for `eyebrow_color: "accent2"`; alone it does nothing. |
| `label_tracking` | `0` or a length (same rule as `letter_spacing`) | Letter-spacing for eyebrows, the index label, the feature label and the footer link label. |
| `label_font` | `"body"` \| `"heading"` \| `"mono"` (unset = as before) | Font for the same labels. |
| `index_label_style` | `"rule"` \| `"bar"` | `bar`: a short accent bar before the label, no trailing rule. |
| `content_width` | `560`–`1100` (px, unset = 820) | Max width of the content column (header row too with `header_align: "content"`). |
| `brand_size` | `"sm"` \| `"md"` \| `"lg"` | Text wordmark in the header: 20 / 26 / 34px. |
| `header_surface` | `"tint"` \| `"bg"` \| `"panel"` (unset = per header variant) | Header background. |
| `tagline_position` | `"inline"` \| `"above"` | `above`: the tagline becomes a small uppercase eyebrow over the brand. |
| `nav_font` | `"body"` \| `"mono"` | `mono` uses `mono_font`. |
| `nav_size` | `"md"` \| `"sm"` | `sm` = 13px. |
| `nav_style` | `"plain"` \| `"ruled"` | `ruled`: hairlines either side of the nav (centered header). |
| `footer_variant` | `"plain"` \| `"band"` \| `"columns"` | `band`: a filled band with an accent top rule and the brand row. `columns`: brand + tagline left, a labelled link column right (the header nav links or Home/About/Authors, the disclosure pages when on, RSS), legal row under a hairline. |
| `footer_surface` | `"panel"` \| `"bg"` \| `"sunken"` (unset = the secondary tint) | `sunken` moves the bg away from the ink (more contrast). |
| `footer_align` | `"left"` \| `"center"` | |
| `footer_links_label` | text ≤ 24 chars | The `columns` link-column label; unset = `Links`. |
| `heading_case_scope` | `"all"` \| `"display"` | With `heading_case: "uppercase"`, `display` keeps h2–h4 in their own case. |

```json
{
  "brand_name": "Example Blog",
  "content_width": 720,
  "pattern": "grid",
  "pattern_strength": "bold",
  "pattern_position": "top-right",
  "post_header_pattern": "dots",
  "hero_wash": { "from": "#e3efe7", "to": "#f6e1da" },
  "eyebrow_color": "accent",
  "post_list_variant": "cards",
  "post_list_columns": 1,
  "card_meta": "author_date",
  "meta_case": "uppercase",
  "byline_prefix": "By",
  "date_format": "short",
  "footer_variant": "columns"
}
```

### v0.8.0 keys — colour roles (all optional)

Three roles that were hard-wired to the accent / muted token get their own optional colour.
A blog that sets none of these renders byte-identically to v0.7.0. Each is a strict hex,
validated like `accent_color_2`; an absent or invalid value keeps the role's previous colour.
The text roles (`link_color`, `meta_color`) are contrast-guarded to AA against the page
background, as the accent is; `rule_color` is a decorative bar and is only re-serialized.

| Key | Type | Notes |
|---|---|---|
| `link_color` | hex | The generic link colour: post-list title links, byline author links, footer links and in-body links (`--link`; `a` / `a:hover`). Hover keeps its underline, so the state stays distinguishable without relying on colour. Default = the accent. Card titles and `post_title_color: "ink"` stay ink; `author_style` overrides still apply. |
| `rule_color` | hex | The short decorative accent bar under a page heading (`--rule`; `.accent-rule`). Default = the accent. A non-accent `divider` still wins. |
| `meta_color` | hex | Dates, bylines and reading-time meta text (`--meta`; `.post-meta`). Default = the muted colour. |

```json
{
  "brand_name": "Example Blog",
  "link_color": "#2b5fa8",
  "rule_color": "#c2410c",
  "meta_color": "#6b7280"
}
```

A generated post body opens with its own `<article><header><h1>…</h1></header>…`. The post page
already renders the title as its `<h1>`, so `PostBody` strips that one leading body headline (and
the `<header>` it empties) from an HTML body before rendering it — only the first `<h1>`, and only
when it leads the article. Markdown bodies and bodies with no leading `<h1>` are unchanged
(`stripLeadingBodyHeadline`).

### Markdown bodies

`MarkdownBody` covers `#`–`###` headings, paragraphs, `- ` lists, `[text](href)` links, `**bold**`,
`*italic*`, `` `inline code` `` and GFM pipe tables (v0.6.0), and a standalone
`![alt](src "caption")` figure. Tables render `thead`/`tbody` with column alignment, inside a
focusable wrapper that scrolls horizontally on a phone. Every piece of text is a React text node
(escaped); a link to a `javascript:` / `data:` / `vbscript:` URL renders as its plain label.

### Multilingual routing + frontmatter (v0.4.0)

A blog can carry posts in many languages. The site's default language is
`config/site.json`'s `language`.

- A post's language is its frontmatter `lang` (BCP-47), defaulting to the site
  language. A default-language post is served at `/posts/<slug>` (**no change**);
  any other language at `/<lang>/posts/<slug>`, with a `/<lang>/` index and a
  `/<lang>/feed.xml` for each non-default language that has ≥1 post.
- Language variants of one article are linked by `translationOf` = the ROOT
  post's slug. A root carries none; each variant points back at the root slug.
  A post's hreflang family is every live post that resolves to the same root
  slug. The page emits `<link rel="alternate" hreflang>` for each family
  language plus an `x-default`, and the sitemap carries matching `xhtml:link`
  alternates.
- `<html lang dir>` comes from `htmlAttributes(lang, theme)`; `dir="rtl"` for
  ar/he/fa/ur (`dirForLang`, extend `RTL_BASE_LANGS`).

Routing/family helpers: `postPathFor`, `postUrlFor`, `langIndexPath`,
`langFeedPath`, `translationFamily`, `familyRootSlug`, `postLang`,
`nonDefaultLanguages`, `languagesPresent`, `postsInLanguage`.

```json
{
  "brand_name": "Example Co",
  "header_variant": "bar",
  "logo_width": 180,
  "surface": { "bg": "#0f172a", "ink": "#e2e8f0", "muted": "#94a3b8", "line": "#1e293b" },
  "nav_links": [
    { "label": "Product", "href": "/product" },
    { "label": "Pricing", "href": "/pricing", "style": "pill" },
    { "label": "Docs", "href": "https://docs.example.com" }
  ]
}
```
- Visibility — `src/content/visibility.ts`. `status: "published"` AND `publishAt` <= build time.
  Fail-closed.

## Sponsor-disclosure mode (opt-in)

Every feature below is **off by default** — a plain blog renders exactly as it did at v0.1.0.
A blog that carries paid placements turns the layer on in `config/site.json`:

```json
"features": { "sponsorDisclosure": true },
"sponsor": {
  "publisherEntity": "Example Publisher, Inc.",
  "attributionUrl": "https://publisher.example.com",
  "attributionText": "Built by Example Publisher",
  "niche": "CRM software",
  "contactEmail": "editorial@blog.example.com"
}
```

With the feature on, the chrome mounts a site-wide disclosure banner, a single
`rel="nofollow sponsored"` footer attribution link, and a `/disclosure` nav entry; a post that
names `paidBrands` shows the per-post paid-placement callout above its byline; the /disclosure +
/about page copy comes from `disclosurePageMarkdown` / `aboutPageMarkdown`; and the JSON-LD
publisher becomes the configured publisher entity. All values come from the site's own config —
the package hard-codes no publisher, product or site.

## What this package must never contain

No secrets, no environment-specific hostnames, and no reference to any specific other site,
product or organization. Every absolute URL is built from the blog's own `canonical_hostname`
or from the publisher/attribution values a consuming site sets in its own config. The
sponsor-disclosure copy is brand-neutral: it names the configured site and publisher through
substitution, never a hard-coded one.
