// Post contract for `content/posts/<slug>.mdx`.
//
// The file is YAML frontmatter followed by the post BODY AS HTML (the API's
// publisher writes its sanitized article HTML; hand-written posts use HTML
// too). The body is rendered as HTML, not compiled as MDX: one stray `{` or an
// unclosed `<br>` in a generated post must never break the whole site's build.
//
// Frontmatter keys (camelCase; written by the API's publisher — change the
// publisher and this contract together):
//
//   title           string, required
//   description     string, optional (meta description + excerpt)
//   status          "published" | "scheduled", required — the app database's
//                   verdict on whether the post is live. Only "published" is
//                   ever rendered.
//   publishAt       ISO-8601, required — the schedule gate. A post renders only
//                   when status is "published" AND publishAt <= build time.
//   updatedAt       ISO-8601, optional (dateModified, sitemap lastmod)
//   lang            BCP-47, optional (defaults to the site language). A post
//                   whose lang is the site default is served at /posts/<slug>;
//                   any other language at /<lang>/posts/<slug>.
//   author          string, required — byline name
//   authorSlug      string, required — links to /authors/<slug> when that
//                   author is listed in config/site.json
//   schemaVariant   "Article" | "BlogPosting", optional (else the theme's)
//   translationOf   string, optional — the slug of the ROOT post this one is a
//                   language variant of. A ROOT post carries NO translationOf;
//                   each of its variants points back at its slug, so the family
//                   is everything that resolves to the same root slug. hreflang
//                   alternates + the language switch are computed at build time
//                   from the LIVE members only.
//   faqSchema       object, optional — a schema.org FAQPage emitted as JSON-LD
//                   (the visible FAQ block is already in the body)
//   faq             [{question, answer}], optional — hand-authored FAQ; renders
//                   the FAQ block AND its FAQPage JSON-LD
//   coverImage      site-relative path, optional (e.g. /images/posts/x/cover.png)
//   coverImageAlt   string, required when coverImage is set
//   bodyFormat      "html" | "markdown", optional — how `html`/body is rendered.
//                   Absent → auto-detected from the body (`resolveBodyFormat`):
//                   a body starting with an HTML block tag is HTML, else
//                   markdown. Set it explicitly to override the detection. A
//                   generated post ships sanitized article HTML (injected
//                   verbatim); a hand-written post may be markdown.
//   paidBrands      string[], optional (default []) — brands featured in this
//                   post under a paid arrangement. ONLY consumed when the site
//                   enables the sponsor-disclosure feature; drives the per-post
//                   disclosure callout. Empty/absent on a normal blog post.
//   otherBrands     string[], optional (default []) — brands also covered with
//                   no paid arrangement; named in the disclosure callout
//                   alongside `paidBrands` when the feature is on.

import type { PostSchemaVariant } from "../theme/schema";

export type PostStatus = "published" | "scheduled";

// How the post body (`Post.html`) is turned into DOM. "html" injects it
// verbatim (already-sanitized article HTML — the generated-post contract and
// the default); "markdown" runs it through the lightweight markdown renderer.
export type BodyFormat = "html" | "markdown";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PostFrontmatter {
  title: string;
  description: string | null;
  status: PostStatus;
  publishAt: string;
  updatedAt: string | null;
  lang: string | null;
  author: string;
  authorSlug: string;
  schemaVariant: PostSchemaVariant | null;
  // The slug of the ROOT post this is a language variant of; null on a root
  // post (and on a monolingual post). Posts that resolve to the same root slug
  // form one hreflang family. See ./languages.ts.
  translationOf: string | null;
  faqSchema: Record<string, unknown> | null;
  faq: FaqItem[];
  coverImage: string | null;
  coverImageAlt: string | null;
  // null = auto-detect from the body at render time (see `resolveBodyFormat`).
  bodyFormat: BodyFormat | null;
  paidBrands: string[];
  otherBrands: string[];
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  html: string;
}

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}
