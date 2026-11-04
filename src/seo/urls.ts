// Every absolute URL a blog emits is built here, from its own canonical
// hostname only — the blog never references another site's host.

import type { Post } from "../content/types";
import { postLang } from "../content/languages";
import { originFor, type SiteConfig } from "../site/schema";

type Host = Pick<SiteConfig, "canonical_hostname">;

export function absoluteUrl(site: Host, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${originFor(site)}${normalized}`;
}

export const postPath = (slug: string): string => `/posts/${slug}`;
export const authorPath = (slug: string): string => `/authors/${slug}`;
export const indexPagePath = (page: number): string => (page <= 1 ? "/" : `/page/${page}`);

export const postUrl = (site: Host, slug: string): string => absoluteUrl(site, postPath(slug));
export const authorUrl = (site: Host, slug: string): string => absoluteUrl(site, authorPath(slug));

// A language-prefixed path segment, e.g. "/es". A non-string / blank lang (the
// default-language case is handled by the callers) yields "".
const langPrefix = (lang: string): string => (lang ? `/${lang}` : "");

// The site-relative path a post is served at: `/posts/<slug>` for a post in the
// site's default language (NO change from the single-language layout), and
// `/<lang>/posts/<slug>` for any other language.
export function postPathFor(post: Pick<Post, "slug" | "frontmatter">, defaultLang: string): string {
  const lang = postLang(post, defaultLang);
  const prefix = lang === defaultLang.trim().toLowerCase() ? "" : langPrefix(lang);
  return `${prefix}${postPath(post.slug)}`;
}

export const postUrlFor = (site: Host, post: Pick<Post, "slug" | "frontmatter">, defaultLang: string): string =>
  absoluteUrl(site, postPathFor(post, defaultLang));

// The index path for one language: "/" for the default language, "/<lang>/" for
// any other. The trailing slash on the prefixed index mirrors a directory index
// (the route is `app/[lang]/page`), so it resolves cleanly on static hosting.
export function langIndexPath(lang: string, defaultLang: string): string {
  return lang.trim().toLowerCase() === defaultLang.trim().toLowerCase() ? "/" : `/${lang.trim().toLowerCase()}/`;
}

// The RSS feed path for one language: "/feed.xml" for the default language,
// "/<lang>/feed.xml" for any other.
export function langFeedPath(lang: string, defaultLang: string): string {
  const l = lang.trim().toLowerCase();
  return l === defaultLang.trim().toLowerCase() ? "/feed.xml" : `/${l}/feed.xml`;
}
