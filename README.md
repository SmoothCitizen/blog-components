# blog-components

Design components for a blog that lives in its own repo: layout chrome, post page, index and
pagination, author pages, about page, FAQ block, typography, the WCAG-guarded palette, SEO
metadata, JSON-LD, sitemap, RSS and robots. Consumed by `customer-blog-template` (a Next.js 14
static export served by Cloudflare Pages).

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
- `content/posts/<slug>.mdx` — `src/content/types.ts`. YAML frontmatter + HTML body. The API's
  publisher writes this shape.
- Visibility — `src/content/visibility.ts`. `status: "published"` AND `publishAt` <= build time.
  Fail-closed.

## What this package must never contain

No secrets, no environment-specific hostnames, and no reference to any other site. Every
absolute URL is built from the blog's own `canonical_hostname`. No disclosure banner and no
sponsored or attribution link: this is the customer's own blog.
