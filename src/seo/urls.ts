// Every absolute URL a blog emits is built here, from its own canonical
// hostname only — the blog never references another site's host.

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
