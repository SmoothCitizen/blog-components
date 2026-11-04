// Post contract for `content/posts/<slug>.mdx`.
//
// The file is YAML frontmatter followed by the post BODY AS HTML (the API's
// publisher writes its sanitized article HTML; hand-written posts use HTML
// too). The body is rendered as HTML, not compiled as MDX: one stray `{` or an
// unclosed `<br>` in a generated post must never break the whole site's build.
//
// Frontmatter keys (camelCase; written by `Network::CustomerRepoProfile` in
// the API — change both together):
//
//   title           string, required
//   description     string, optional (meta description + excerpt)
//   status          "published" | "scheduled", required — the app database's
//                   verdict on whether the post is live. Only "published" is
//                   ever rendered.
//   publishAt       ISO-8601, required — the schedule gate. A post renders only
//                   when status is "published" AND publishAt <= build time.
//   updatedAt       ISO-8601, optional (dateModified, sitemap lastmod)
//   lang            BCP-47, optional (defaults to the site language)
//   author          string, required — byline name
//   authorSlug      string, required — links to /authors/<slug> when that
//                   author is listed in config/site.json
//   schemaVariant   "Article" | "BlogPosting", optional (else the theme's)
//   translationKey  string, optional — posts sharing a key are language
//                   versions of one article; hreflang alternates are computed
//                   at build time from the LIVE members only
//   faqSchema       object, optional — a schema.org FAQPage emitted as JSON-LD
//                   (the visible FAQ block is already in the body)
//   faq             [{question, answer}], optional — hand-authored FAQ; renders
//                   the FAQ block AND its FAQPage JSON-LD
//   coverImage      site-relative path, optional (e.g. /images/posts/x/cover.png)
//   coverImageAlt   string, required when coverImage is set

import type { SchemaVariant } from "../theme/schema";

export type PostStatus = "published" | "scheduled";

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
  schemaVariant: SchemaVariant | null;
  translationKey: string | null;
  faqSchema: Record<string, unknown> | null;
  faq: FaqItem[];
  coverImage: string | null;
  coverImageAlt: string | null;
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
