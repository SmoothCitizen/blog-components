// Next.js `Metadata` builders: title, description, canonical, Open Graph,
// Twitter card, RSS discovery and hreflang alternates. Canonical URLs are
// always absolute on the blog's own hostname.

import type { Metadata } from "next";

import type { HreflangAlternate, Post } from "../content/types";
import type { SiteConfig } from "../site/schema";
import type { ThemeConfig } from "../theme/schema";
import { absoluteUrl, postPath } from "./urls";

type SiteRef = Pick<SiteConfig, "canonical_hostname" | "description">;
type ThemeRef = Pick<ThemeConfig, "brand_name" | "tagline">;

export function siteMetadata(site: SiteRef, theme: ThemeRef): Metadata {
  const description = site.description ?? theme.tagline ?? theme.brand_name;
  return {
    metadataBase: new URL(absoluteUrl(site, "/")),
    title: { default: theme.brand_name, template: `%s — ${theme.brand_name}` },
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: absoluteUrl(site, "/"),
      types: { "application/rss+xml": absoluteUrl(site, "/feed.xml") },
    },
    openGraph: { type: "website", siteName: theme.brand_name, url: absoluteUrl(site, "/"), description },
    twitter: { card: "summary", description },
  };
}

// Metadata for a non-post page (index page N, about, authors, author page).
export function pageMetadata(
  site: SiteRef,
  theme: ThemeRef,
  opts: { title: string | null; description: string | null; path: string },
): Metadata {
  const url = absoluteUrl(site, opts.path);
  const description = opts.description ?? site.description ?? theme.tagline ?? theme.brand_name;
  return {
    ...(opts.title ? { title: opts.title } : {}),
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: theme.brand_name, url, description },
  };
}

export function postMetadata(
  post: Post,
  site: SiteRef,
  theme: ThemeRef,
  alternates: readonly HreflangAlternate[],
): Metadata {
  const fm = post.frontmatter;
  const url = absoluteUrl(site, postPath(post.slug));
  const description = fm.description ?? theme.tagline ?? theme.brand_name;
  const image = fm.coverImage ? absoluteUrl(site, fm.coverImage) : null;
  return {
    title: fm.title,
    description,
    alternates: {
      canonical: url,
      ...(alternates.length > 0
        ? { languages: Object.fromEntries(alternates.map((a) => [a.hreflang, a.href])) }
        : {}),
    },
    openGraph: {
      type: "article",
      siteName: theme.brand_name,
      url,
      title: fm.title,
      description,
      publishedTime: fm.publishAt,
      ...(fm.updatedAt ? { modifiedTime: fm.updatedAt } : {}),
      authors: [fm.author],
      ...(image ? { images: [{ url: image, alt: fm.coverImageAlt ?? fm.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fm.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
