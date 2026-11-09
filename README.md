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
| `nav_links[].type: "language_switch"` | enum value | A nav entry that renders the language switcher (links/pill to the site's languages or a post's siblings) instead of a plain link. Carries no `label`/`href`. Hidden when the site has a single language. Plain entries default to `type: "link"` and are unchanged. |

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
