// sitemap.xml / feed.xml / robots.txt. Each references only the blog's own
// hostname. The sitemap lists LIVE posts in EVERY language (pass the full
// `livePosts` output); a per-language feed lists only its own language's posts
// (the caller filters with `postsInLanguage`).

import { hreflangAlternates } from "../content/hreflang";
import { nonDefaultLanguages } from "../content/languages";
import type { Post } from "../content/types";
import type { SiteConfig } from "../site/schema";
import type { ThemeConfig } from "../theme/schema";
import { escapeXml, toIsoDate, toRfc822 } from "../util";
import { absoluteUrl, authorPath, indexPagePath, langFeedPath, langIndexPath, postPathFor } from "./urls";

// AI crawlers explicitly welcomed (the blog exists to be read and cited).
export const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"] as const;

type SiteRef = Pick<SiteConfig, "canonical_hostname" | "language" | "authors" | "description">;

export function sitemapXml(site: SiteRef, live: readonly Post[], totalIndexPages: number): string {
  const urls: string[] = [];
  const add = (path: string, lastmod?: string | null, alternatesXml = "") => {
    const date = lastmod ? toIsoDate(lastmod) : "";
    urls.push(
      `  <url><loc>${escapeXml(absoluteUrl(site, path))}</loc>` +
        `${date ? `<lastmod>${date}</lastmod>` : ""}${alternatesXml}</url>`,
    );
  };

  add("/", live[0]?.frontmatter.updatedAt ?? live[0]?.frontmatter.publishAt);
  for (let page = 2; page <= totalIndexPages; page += 1) add(indexPagePath(page));
  add("/posts");
  add("/about");
  add("/authors");
  for (const author of site.authors) add(authorPath(author.slug));

  // Per-language index + feed for each non-default language that has posts.
  for (const lang of nonDefaultLanguages(live, site.language)) {
    add(langIndexPath(lang, site.language));
    add(langFeedPath(lang, site.language));
  }

  for (const post of live) {
    add(
      postPathFor(post, site.language),
      post.frontmatter.updatedAt ?? post.frontmatter.publishAt,
      alternatesXml(post, live, site),
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
}

// `<xhtml:link rel="alternate" hreflang=…>` rows for a post that has language
// siblings; "" for a monolingual post. Reuses the hreflang family computation
// so the sitemap alternates and the page's <head> alternates never disagree.
function alternatesXml(post: Post, live: readonly Post[], site: SiteRef): string {
  const alternates = hreflangAlternates(post, live, site);
  if (alternates.length === 0) return "";
  return alternates
    .map(
      (a) =>
        `<xhtml:link rel="alternate" hreflang="${escapeXml(a.hreflang)}" href="${escapeXml(a.href)}"/>`,
    )
    .join("");
}

export function robotsTxt(site: Pick<SiteConfig, "canonical_hostname">): string {
  const lines: string[] = ["User-agent: *", "Allow: /", ""];
  for (const bot of AI_CRAWLERS) lines.push(`User-agent: ${bot}`, "Allow: /", "");
  lines.push(`Sitemap: ${absoluteUrl(site, "/sitemap.xml")}`, "");
  return lines.join("\n");
}

// An RSS feed. With no `opts` it is the site-default feed at `/feed.xml`
// (byte-identical to before). A per-language feed passes `lang`: the `posts`
// are that language's posts (filter with `postsInLanguage`), and the channel
// link + atom:self + <language> reflect the language.
export function rssXml(
  site: SiteRef,
  theme: Pick<ThemeConfig, "brand_name" | "tagline">,
  posts: readonly Post[],
  opts: { lang?: string } = {},
): string {
  const lang = (opts.lang ?? site.language).trim().toLowerCase();
  const items = posts
    .map((post) => {
      const link = absoluteUrl(site, postPathFor(post, site.language));
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
    <link>${escapeXml(absoluteUrl(site, langIndexPath(lang, site.language)))}</link>
    <description>${escapeXml(site.description ?? theme.tagline ?? theme.brand_name)}</description>
    <language>${escapeXml(lang)}</language>
    <atom:link href="${escapeXml(absoluteUrl(site, langFeedPath(lang, site.language)))}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}
