// sitemap.xml / feed.xml / robots.txt. Each references only the blog's own
// hostname, and lists LIVE posts only (pass the output of `livePosts`).

import type { Post } from "../content/types";
import type { SiteConfig } from "../site/schema";
import type { ThemeConfig } from "../theme/schema";
import { escapeXml, toIsoDate, toRfc822 } from "../util";
import { absoluteUrl, authorPath, indexPagePath, postPath } from "./urls";

// AI crawlers explicitly welcomed (the blog exists to be read and cited).
export const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"] as const;

type SiteRef = Pick<SiteConfig, "canonical_hostname" | "language" | "authors" | "description">;

export function sitemapXml(site: SiteRef, live: readonly Post[], totalIndexPages: number): string {
  const urls: string[] = [];
  const add = (path: string, lastmod?: string | null) => {
    const date = lastmod ? toIsoDate(lastmod) : "";
    urls.push(
      `  <url><loc>${escapeXml(absoluteUrl(site, path))}</loc>${date ? `<lastmod>${date}</lastmod>` : ""}</url>`,
    );
  };

  add("/", live[0]?.frontmatter.updatedAt ?? live[0]?.frontmatter.publishAt);
  for (let page = 2; page <= totalIndexPages; page += 1) add(indexPagePath(page));
  add("/posts");
  add("/about");
  add("/authors");
  for (const author of site.authors) add(authorPath(author.slug));
  for (const post of live) add(postPath(post.slug), post.frontmatter.updatedAt ?? post.frontmatter.publishAt);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

export function robotsTxt(site: Pick<SiteConfig, "canonical_hostname">): string {
  const lines: string[] = ["User-agent: *", "Allow: /", ""];
  for (const bot of AI_CRAWLERS) lines.push(`User-agent: ${bot}`, "Allow: /", "");
  lines.push(`Sitemap: ${absoluteUrl(site, "/sitemap.xml")}`, "");
  return lines.join("\n");
}

export function rssXml(
  site: SiteRef,
  theme: Pick<ThemeConfig, "brand_name" | "tagline">,
  live: readonly Post[],
): string {
  const items = live
    .map((post) => {
      const link = absoluteUrl(site, postPath(post.slug));
      return `    <item>
      <title>${escapeXml(post.frontmatter.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${escapeXml(toRfc822(post.frontmatter.publishAt))}</pubDate>
      <description>${escapeXml(post.frontmatter.description ?? "")}</description>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(theme.brand_name)}</title>
    <link>${escapeXml(absoluteUrl(site, "/"))}</link>
    <description>${escapeXml(site.description ?? theme.tagline ?? theme.brand_name)}</description>
    <language>${escapeXml(site.language)}</language>
    <atom:link href="${escapeXml(absoluteUrl(site, "/feed.xml"))}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}
