import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "../src/content/frontmatter";
import type { Post } from "../src/content/types";
import { postJsonLd, siteJsonLd } from "../src/seo/jsonld";
import { robotsTxt, rssXml, sitemapXml } from "../src/seo/feeds";
import { postMetadata } from "../src/seo/metadata";
import { parseTheme } from "../src/theme/schema";
import type { SiteConfig } from "../src/site/schema";

const SITE: SiteConfig = {
  site_name: "Example Blog",
  canonical_hostname: "blog.example.com",
  language: "en",
  description: "Notes from Example Co",
  authors: [{ slug: "jane-doe", name: "Jane Doe", title: "Founder", bio: "Writes things.", expertise: [] }],
  features: { sponsorDisclosure: false },
  sponsor: null,
};
const THEME = parseTheme({ brand_name: "Example Co", logo_key: "images/logo.png" });

const post = (slug: string, overrides: Record<string, unknown> = {}): Post => ({
  slug,
  frontmatter: parseFrontmatter(
    {
      title: `Title & <${slug}>`,
      description: "Desc",
      status: "published",
      publishAt: "2026-11-01T09:00:00Z",
      author: "Jane Doe",
      authorSlug: "jane-doe",
      ...overrides,
    },
    slug,
  ),
  html: "<p>x</p>",
});

describe("postJsonLd", () => {
  it("emits Article/Person/Organization on the blog's own host, with the brand as publisher", () => {
    const blocks = postJsonLd(post("a-post"), SITE, THEME, SITE.authors[0]);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({
      "@type": "BlogPosting",
      url: "https://blog.example.com/posts/a-post",
      datePublished: "2026-11-01T09:00:00Z",
      author: { name: "Jane Doe", jobTitle: "Founder", url: "https://blog.example.com/authors/jane-doe" },
      publisher: { name: "Example Co", logo: { url: "https://blog.example.com/images/logo.png" } },
    });
  });

  it("adds the publisher's FAQPage, or one built from a hand-authored faq list", () => {
    const fromSchema = postJsonLd(
      post("a", { faqSchema: { "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "Q" }] } }),
      SITE,
      THEME,
      undefined,
    );
    expect(fromSchema[3]).toMatchObject({ "@context": "https://schema.org", "@type": "FAQPage" });

    const fromList = postJsonLd(post("b", { faq: [{ question: "Q?", answer: "A." }] }), SITE, THEME, undefined);
    expect(fromList[3]).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [{ name: "Q?", acceptedAnswer: { text: "A." } }],
    });

    expect(postJsonLd(post("c"), SITE, THEME, undefined)).toHaveLength(3);
  });

  it("describes the blog itself", () => {
    expect(siteJsonLd(SITE, THEME)[0]).toMatchObject({ "@type": "Blog", url: "https://blog.example.com/" });
  });
});

describe("feeds", () => {
  it("sitemap lists index pages, authors and live posts with escaped URLs", () => {
    const xml = sitemapXml(SITE, [post("a-post", { updatedAt: "2026-11-03T00:00:00Z" })], 2);
    expect(xml).toContain("<loc>https://blog.example.com/</loc>");
    expect(xml).toContain("<loc>https://blog.example.com/page/2</loc>");
    expect(xml).toContain("<loc>https://blog.example.com/authors/jane-doe</loc>");
    expect(xml).toContain("<loc>https://blog.example.com/posts/a-post</loc><lastmod>2026-11-03</lastmod>");
  });

  it("RSS escapes titles", () => {
    const xml = rssXml(SITE, THEME, [post("a-post")]);
    expect(xml).toContain("<title>Title &amp; &lt;a-post&gt;</title>");
    expect(xml).toContain("<pubDate>Sun, 01 Nov 2026 09:00:00 GMT</pubDate>");
  });

  it("robots points at the blog's own sitemap", () => {
    expect(robotsTxt(SITE)).toContain("Sitemap: https://blog.example.com/sitemap.xml");
  });
});

describe("postMetadata", () => {
  it("sets an absolute canonical and hreflang languages", () => {
    const meta = postMetadata(post("a-post"), SITE, THEME, [
      { hreflang: "en", href: "https://blog.example.com/posts/a-post" },
      { hreflang: "ja", href: "https://blog.example.com/posts/a-post-ja" },
    ]);
    expect(meta.alternates).toEqual({
      canonical: "https://blog.example.com/posts/a-post",
      languages: { en: "https://blog.example.com/posts/a-post", ja: "https://blog.example.com/posts/a-post-ja" },
    });
  });
});
