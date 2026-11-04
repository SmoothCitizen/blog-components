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
compact) and `post_variant` (classic / wide / narrow). `class_prefix` namespaces every rendered
class name and the matching stylesheet selectors (`classer` + `prefixStylesheet`), so two sites do
not ship byte-identical markup. Every field is optional and defaults so that a config written for
v0.1.0 renders byte-identically (empty prefix, default variants).
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
